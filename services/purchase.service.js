// services/purchase.service.js
const dayjs = require('dayjs');
const { sequelize, User, Purchase, Bundle, BundleItem, SessionType, TutorProfile } = require('../models');
const { isAtLeast24hLater } = require('../utils/date');
const { purchaseConfirmationEmail } = require('../utils/emailTemplates'); // used by payment service
const { sendVerifyEmail } = require('./email.service'); // (not used here—kept for symmetry)

function toAmount(num) {
  return Number.parseFloat(Number(num).toFixed(2));
}

async function computeBundleHoursAndAmount(bundleId) {
  const bundle = await Bundle.findByPk(bundleId, {
    include: [{ model: BundleItem, as: 'items', include: [{ model: SessionType, as: 'sessionType' }] }]
  });
  if (!bundle) { const e = new Error('Invalid bundleId'); e.status = 400; throw e; }

  let hours = 0;
  let studentAmount = 0; // What students pay
  let tutorAmount = 0;   // What tutors earn
  
  for (const it of (bundle.items || [])) {
    hours += it.hours;
    if (it.sessionType?.hourlyRate) {
      // Student pays the hourly rate
      studentAmount += it.hours * Number(it.sessionType.hourlyRate);
      
      // Tutor earns tutorRate if available, otherwise hourlyRate
      const tutorRate = it.sessionType.tutorRate || it.sessionType.hourlyRate;
      tutorAmount += it.hours * Number(tutorRate);
    }
  }
  
  return { 
    sessionsPurchased: hours, 
    amount: toAmount(studentAmount), // Students pay this amount
    tutorAmount: toAmount(tutorAmount), // Tutors earn this amount
    platformProfit: toAmount(studentAmount - tutorAmount), // Platform profit
    bundle 
  };
}

async function computeCustomHoursAndAmount(sessionTypeId, hours) {
  const st = await SessionType.findByPk(sessionTypeId);
  if (!st) { const e = new Error('Invalid sessionTypeId'); e.status = 400; throw e; }
  if (!Number.isInteger(hours) || hours < 1) { const e = new Error('Invalid hours'); e.status = 400; throw e; }

  const studentAmount = toAmount(hours * Number(st.hourlyRate));
  const tutorRate = st.tutorRate || st.hourlyRate;
  const tutorAmount = toAmount(hours * Number(tutorRate));
  
  return { 
    sessionsPurchased: hours, 
    amount: studentAmount, // Students pay this amount
    tutorAmount: tutorAmount, // Tutors earn this amount
    platformProfit: toAmount(studentAmount - tutorAmount), // Platform profit
    sessionType: st 
  };
}

async function createPurchase(studentId, payload) {
  const { bundleId, sessionTypeId, hours, startDate, currency = 'USD' } = payload;

  if (!isAtLeast24hLater(startDate)) {
    const e = new Error('startDate must be at least 24 hours in the future'); e.status = 400; throw e;
  }

  return sequelize.transaction(async (t) => {
    let sessionsPurchased = 0;
    let studentAmount = 0; // What students pay (stored in purchase.amount)
    let tutorAmount = 0;   // What tutors earn (calculated dynamically)
    let platformProfit = 0; // Platform profit (calculated dynamically)

    if (bundleId) {
      const calc = await computeBundleHoursAndAmount(bundleId);
      sessionsPurchased = calc.sessionsPurchased;
      studentAmount = calc.amount; // Students pay this
      tutorAmount = calc.tutorAmount; // Tutors earn this
      platformProfit = calc.platformProfit; // Platform profit
    } else {
      const calc = await computeCustomHoursAndAmount(sessionTypeId, hours);
      sessionsPurchased = calc.sessionsPurchased;
      studentAmount = calc.amount; // Students pay this
      tutorAmount = calc.tutorAmount; // Tutors earn this
      platformProfit = calc.platformProfit; // Platform profit
    }

    const purchase = await Purchase.create({
      studentId, bundleId: bundleId || null, sessionTypeId: sessionTypeId || null,
      sessionsPurchased: sessionsPurchased, startDate: dayjs(startDate).toDate(),
      status: 'pending', amount: studentAmount, currency // Store student amount
    }, { transaction: t });

    const purchaseWithDetails = await Purchase.findByPk(purchase.id, {
      include: [
        { model: Bundle, as: 'bundle', include: [{ model: BundleItem, as: 'items', include: [{ model: SessionType, as: 'sessionType' }] }] },
        { model: SessionType, as: 'sessionType' },
        { 
          model: User, 
          as: 'assignedTutor', 
          attributes: ['id', 'email'],
          include: [
            { 
              model: TutorProfile, 
              as: 'tutorProfile', 
              attributes: ['fullName'],
              required: false 
            }
          ]
        }
      ],
      transaction: t
    });

    // Add calculated values to the response (not stored in DB)
    purchaseWithDetails.dataValues.tutorAmount = tutorAmount;
    purchaseWithDetails.dataValues.platformProfit = platformProfit;

    return purchaseWithDetails;
  });
}

async function listMyPurchases(studentId) {
  const purchases = await Purchase.findAll({
    where: { studentId },
    order: [['createdAt', 'DESC']],
    include: [
      { model: Bundle, as: 'bundle', include: [{ model: BundleItem, as: 'items', include: [{ model: SessionType, as: 'sessionType' }] }] },
      { model: SessionType, as: 'sessionType' },
      { 
        model: User, 
        as: 'assignedTutor', 
        attributes: ['id', 'email'],
        include: [
          { 
            model: TutorProfile, 
            as: 'tutorProfile', 
            attributes: ['fullName'],
            required: false 
          }
        ]
      }
    ]
  });

  // Add calculated tutor amounts and platform profit to each purchase
  return purchases.map(purchase => {
    let tutorAmount = 0;
    let platformProfit = 0;

    if (purchase.bundle && purchase.bundle.items) {
      // Bundle purchase
      for (const item of purchase.bundle.items) {
        if (item.sessionType) {
          const studentRate = Number(item.sessionType.hourlyRate || 0);
          const tutorRate = Number(item.sessionType.tutorRate || item.sessionType.hourlyRate || 0);
          const hours = Number(item.hours || 0);
          
          tutorAmount += hours * tutorRate;
          platformProfit += hours * (studentRate - tutorRate);
        }
      }
    } else if (purchase.sessionType) {
      // Single session purchase
      const studentRate = Number(purchase.sessionType.hourlyRate || 0);
      const tutorRate = Number(purchase.sessionType.tutorRate || purchase.sessionType.hourlyRate || 0);
      const hours = Number(purchase.sessionsPurchased || 0);
      
      tutorAmount = hours * tutorRate;
      platformProfit = hours * (studentRate - tutorRate);
    }

    purchase.dataValues.tutorAmount = toAmount(tutorAmount);
    purchase.dataValues.platformProfit = toAmount(platformProfit);
    
    return purchase;
  });
}

module.exports = { createPurchase, listMyPurchases };

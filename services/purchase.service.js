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
  let amount = 0;
  for (const it of (bundle.items || [])) {
    hours += it.hours;
    if (it.sessionType?.hourlyRate) {
      amount += it.hours * Number(it.sessionType.hourlyRate);
    }
  }
  return { sessionsPurchased: hours, amount: toAmount(amount), bundle };
}

async function computeCustomHoursAndAmount(sessionTypeId, hours) {
  const st = await SessionType.findByPk(sessionTypeId);
  if (!st) { const e = new Error('Invalid sessionTypeId'); e.status = 400; throw e; }
  if (!Number.isInteger(hours) || hours < 1) { const e = new Error('Invalid hours'); e.status = 400; throw e; }

  const amount = toAmount(hours * Number(st.hourlyRate));
  return { sessionsPurchased: hours, amount, sessionType: st };
}

async function createPurchase(studentId, payload) {
  const { bundleId, sessionTypeId, hours, startDate, currency = 'USD' } = payload;

  if (!isAtLeast24hLater(startDate)) {
    const e = new Error('startDate must be at least 24 hours in the future'); e.status = 400; throw e;
  }

  return sequelize.transaction(async (t) => {
    let sessionsPurchased = 0;
    let amount = 0;

    if (bundleId) {
      const calc = await computeBundleHoursAndAmount(bundleId);
      sessionsPurchased = calc.sessionsPurchased;
      amount = calc.amount;
    } else {
      const calc = await computeCustomHoursAndAmount(sessionTypeId, hours);
      sessionsPurchased = calc.sessionsPurchased;
      amount = calc.amount;
    }

    const purchase = await Purchase.create({
      studentId, bundleId: bundleId || null, sessionTypeId: sessionTypeId || null,
      sessionsPurchased: sessionsPurchased, startDate: dayjs(startDate).toDate(),
      status: 'pending', amount, currency
    }, { transaction: t });

    return Purchase.findByPk(purchase.id, {
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
  });
}

async function listMyPurchases(studentId) {
  return Purchase.findAll({
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
}

module.exports = { createPurchase, listMyPurchases };

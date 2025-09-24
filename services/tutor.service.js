// services/tutor.service.js
const {
  sequelize, User, TutorProfile, TutorRank, Language, Subject, BacType,
  Assignment, StudentProfile, SessionType, Bundle, CalendarEvent
} = require('../models');
const {Op} = require("sequelize");

const includeTree = [
  { model: TutorRank, as: 'rank' },
  { model: Language, as: 'languages', through: { attributes: [] } },
  { model: Subject,  as: 'subjects',  through: { attributes: [] } },
  { model: BacType,  as: 'bacTypes',  through: { attributes: [] } }
];

async function getMe(userId) {
  const user = await User.findByPk(userId);
  if (!user) { const e = new Error('User not found'); e.status = 404; throw e; }

  const withProfile = await User.findByPk(userId, {
    include: [{ model: TutorProfile, as: 'tutorProfile', required: true, include: includeTree }]
  });

  if (!withProfile) {
    const e = new Error('Tutor profile not found for this user');
    e.status = 404;
    throw e;
  }
  return withProfile.tutorProfile;
}

async function upsertMe(userId, payload) {
  const {
    fullName, phone, dob, address, educationLevel, availabilityHoursPerWeek,
    tutoringType, payoutMethod, rankId, idDocumentUrl, profilePictureUrl,
    preferredGradesText, languageIds = [], subjectIds = [], bacTypeIds = []
  } = payload;

  return sequelize.transaction(async (t) => {
    let profile = await TutorProfile.findOne({ where: { userId }, transaction: t });

    if (!profile) {
      profile = await TutorProfile.create({
        userId, fullName, phone, dob, address, educationLevel, availabilityHoursPerWeek,
        tutoringType, payoutMethod, rankId, idDocumentUrl, profilePictureUrl, preferredGradesText
      }, { transaction: t });
    } else {
      await profile.update({
        fullName, phone, dob, address, educationLevel, availabilityHoursPerWeek,
        tutoringType, payoutMethod, rankId, idDocumentUrl, profilePictureUrl, preferredGradesText
      }, { transaction: t });
    }

    const langs = languageIds.length ? await Language.findAll({ where: { id: languageIds }, transaction: t }) : [];
    if (languageIds.length && langs.length !== languageIds.length) { const e = new Error('Invalid languageIds'); e.status = 400; throw e; }
    await profile.setLanguages(langs, { transaction: t });

    const subs = subjectIds.length ? await Subject.findAll({ where: { id: subjectIds }, transaction: t }) : [];
    if (subjectIds.length && subs.length !== subjectIds.length) { const e = new Error('Invalid subjectIds'); e.status = 400; throw e; }
    await profile.setSubjects(subs, { transaction: t });

    const bacs = bacTypeIds.length ? await BacType.findAll({ where: { id: bacTypeIds }, transaction: t }) : [];
    if (bacTypeIds.length && bacs.length !== bacTypeIds.length) { const e = new Error('Invalid bacTypeIds'); e.status = 400; throw e; }
    await profile.setBacTypes(bacs, { transaction: t });

    return TutorProfile.findByPk(profile.id, { include: includeTree, transaction: t });
  });
}

/** Unique students assigned to this tutor */
async function listAssignedStudents(tutorUserId) {
  const rows = await Assignment.findAll({
    where: { tutorId: tutorUserId },
    include: [{
      association: 'student',
      attributes: ['id', 'email'],
      include: [{ model: StudentProfile, as: 'studentProfile', attributes: ['fullName'] }]
    }],
    order: [['createdAt', 'DESC']],
  });

  const seen = new Set();
  const out = [];
  for (const a of rows) {
    const s = a.student;
    if (s && !seen.has(s.id)) {
      seen.add(s.id);
      out.push({
        id: s.id,
        email: s.email,
        fullName: s.studentProfile?.fullName || s.email,
      });
    }
  }
  return out;
}

const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

// Uses SessionType.sessionHours for duration; counts come from Purchase
function computeSessionStats(pJSON) {
    if (!pJSON) {
        return {
            sessionsPurchased: null,
            sessionsConsumed: null,
            sessionsRemaining: null,
            sessionDurationMinutes: 60,
            sessionHours: 1,
        };
    }

    const st = pJSON.sessionType || {};
    const sessionHours = toNum(st.sessionHours) ?? 1;      // default 1 hour if missing
    const sessionDurationMinutes = sessionHours * 60;

    const sessionsPurchased = toNum(pJSON.sessionsPurchased) ?? 0;
    const sessionsConsumed  = toNum(pJSON.sessionsConsumed)  ?? 0;
    const sessionsRemaining = Math.max(0, sessionsPurchased - sessionsConsumed);

    return { sessionsPurchased, sessionsConsumed, sessionsRemaining, sessionDurationMinutes, sessionHours };
}

async function listAssignmentsDetailed(tutorUserId) {
    const rows = await Assignment.findAll({
        where: { tutorId: tutorUserId },
        include: [
            {
                association: 'student',
                attributes: ['id', 'email'],
                include: [{ model: StudentProfile, as: 'studentProfile', attributes: ['fullName'] }],
            },
            {
                association: 'purchase',
                required: false,
                attributes: { exclude: [] }, // all purchase fields
                include: [
                    { model: SessionType, as: 'sessionType', attributes: { exclude: [] } },
                    { model: Bundle, as: 'bundle', attributes: { exclude: [] } },

                    // ⭐ NEW: grab scheduled (non-cancelled) events for this purchase
                    {
                        model: CalendarEvent,
                        as: 'calendarEvents',
                        attributes: ['id'],
                        required: false,
                        where: {
                            status: { [Op.notIn]: ['cancelled', 'rejected'] }
                        },
                        separate: true,
                    },
                ],
            },
        ],
        order: [['createdAt', 'DESC']],
    });

    return rows.map(a => {
        const p = a.purchase;
        const pJSON = p?.toJSON ? p.toJSON() : p || null;

        const stats = computeSessionStats(pJSON); // your existing helper
        const scheduledCount = Array.isArray(pJSON?.calendarEvents) ? pJSON.calendarEvents.length : 0;

        // sessionsRemaining is what’s not yet consumed; we also subtract scheduled-but-not-done
        const sessionsRemaining = stats.sessionsRemaining ?? Math.max((stats.sessionsPurchased || 0) - (stats.sessionsConsumed || 0), 0);
        const schedulingLimitRemaining = Math.max(sessionsRemaining - scheduledCount, 0);

        return {
            id: a.id,
            student: {
                id: a.student?.id,
                email: a.student?.email,
                fullName: a.student?.studentProfile?.fullName || a.student?.email,
            },
            purchase: pJSON
                ? {
                    ...pJSON, // keep all purchase columns & nested associations
                    sessionType: pJSON.sessionType || null,
                    bundle: pJSON.bundle || null,

                    // original computed stats
                    sessionsPurchased: stats.sessionsPurchased,
                    sessionsConsumed:  stats.sessionsConsumed,
                    sessionsRemaining, // keep this aligned with your computeSessionStats

                    // handy helpers
                    sessionDurationMinutes: stats.sessionDurationMinutes,
                    sessionHours: stats.sessionHours,

                    // ⭐ NEW: scheduling constraints
                    scheduledCount,                 // how many non-cancelled events are already on the calendar
                    schedulingLimitRemaining,       // how many more sessions can be scheduled
                    canScheduleAnotherSession: schedulingLimitRemaining > 0,
                }
                : null,
        };
    });
}

module.exports = {
  getMe,
  upsertMe,
  listAssignedStudents,
  listAssignmentsDetailed
};

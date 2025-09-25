// models/index.js
const Sequelize = require('sequelize');
const sequelize = require('../config/database');

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Phase 1
db.User = require('./User')(sequelize, Sequelize.DataTypes);
db.EmailVerification = require('./EmailVerification')(sequelize, Sequelize.DataTypes);
db.PasswordResetToken = require('./PasswordResetToken')(sequelize, Sequelize.DataTypes);

// Phase 2
db.Language = require('./Language')(sequelize, Sequelize.DataTypes);
db.Subject = require('./Subject')(sequelize, Sequelize.DataTypes);
db.Grade = require('./Grade')(sequelize, Sequelize.DataTypes);
db.BacType = require('./BacType')(sequelize, Sequelize.DataTypes);
db.TutorRank = require('./TutorRank')(sequelize, Sequelize.DataTypes);
db.SessionType = require('./SessionType')(sequelize, Sequelize.DataTypes);
db.Bundle = require('./Bundle')(sequelize, Sequelize.DataTypes);
db.BundleItem = require('./BundleItem')(sequelize, Sequelize.DataTypes);

// Phase 3
db.StudentProfile = require('./StudentProfile')(sequelize, Sequelize.DataTypes);
db.TutorProfile = require('./TutorProfile')(sequelize, Sequelize.DataTypes);
db.StudentLanguage = require('./StudentLanguage')(sequelize, Sequelize.DataTypes);
db.StudentSubject  = require('./StudentSubject')(sequelize, Sequelize.DataTypes);
db.StudentBacType  = require('./StudentBacType')(sequelize, Sequelize.DataTypes);
db.TutorLanguage = require('./TutorLanguage')(sequelize, Sequelize.DataTypes);
db.TutorSubject  = require('./TutorSubject')(sequelize, Sequelize.DataTypes);
db.TutorBacType  = require('./TutorBacType')(sequelize, Sequelize.DataTypes);

// Phase 4
db.Purchase = require('./Purchase')(sequelize, Sequelize.DataTypes);
db.PaymentTransaction = require('./PaymentTransaction')(sequelize, Sequelize.DataTypes);

// Phase 5
db.Assignment = require('./Assignment')(sequelize, Sequelize.DataTypes);
db.TutorChangeRequest = require('./TutorChangeRequest')(sequelize, Sequelize.DataTypes);

// Phase 6
db.CalendarEvent = require('./CalendarEvent')(sequelize, Sequelize.DataTypes);

// Phase 7
db.Session = require('./Session')(sequelize, Sequelize.DataTypes);
db.SessionTiming = require('./SessionTiming')(sequelize, Sequelize.DataTypes);
db.Consumption = require('./Consumption')(sequelize, Sequelize.DataTypes);
db.Timesheet = require('./Timesheet')(sequelize, Sequelize.DataTypes);
db.Feedback = require('./Feedback')(sequelize, Sequelize.DataTypes);

db.SupportMessage = require('./SupportMessage')(sequelize, Sequelize.DataTypes);


// Associations (Phase 1)
db.User.hasMany(db.EmailVerification, { foreignKey: 'userId', as: 'emailVerifications', onDelete: 'CASCADE' });
db.EmailVerification.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });
db.User.hasMany(db.PasswordResetToken, { foreignKey: 'userId', as: 'passwordResetTokens', onDelete: 'CASCADE' });
db.PasswordResetToken.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });

// Associations (Phase 2)
db.Bundle.hasMany(db.BundleItem, { foreignKey: 'bundleId', as: 'items', onDelete: 'CASCADE', hooks: true });
db.BundleItem.belongsTo(db.Bundle, { foreignKey: 'bundleId', as: 'bundle' });
db.SessionType.hasMany(db.BundleItem, { foreignKey: 'sessionTypeId', as: 'bundleItems' });
db.BundleItem.belongsTo(db.SessionType, { foreignKey: 'sessionTypeId', as: 'sessionType' });

// Associations (Phase 3)
db.User.hasOne(db.StudentProfile, { foreignKey: 'userId', as: 'studentProfile', onDelete: 'CASCADE' });
db.StudentProfile.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });
db.StudentProfile.belongsTo(db.Grade, { foreignKey: 'gradeId', as: 'grade' });
db.User.hasOne(db.TutorProfile, { foreignKey: 'userId', as: 'tutorProfile', onDelete: 'CASCADE' });
db.TutorProfile.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });
db.TutorProfile.belongsTo(db.TutorRank, { foreignKey: 'rankId', as: 'rank' });

db.StudentProfile.belongsToMany(db.Language, {
  through: db.StudentLanguage, foreignKey: 'studentProfileId', otherKey: 'languageId', as: 'languages'
});
db.Language.belongsToMany(db.StudentProfile, {
  through: db.StudentLanguage, foreignKey: 'languageId', otherKey: 'studentProfileId', as: 'studentProfiles'
});
db.StudentProfile.belongsToMany(db.Subject, {
  through: db.StudentSubject, foreignKey: 'studentProfileId', otherKey: 'subjectId', as: 'subjects'
});
db.Subject.belongsToMany(db.StudentProfile, {
  through: db.StudentSubject, foreignKey: 'subjectId', otherKey: 'studentProfileId', as: 'studentProfiles'
});
db.StudentProfile.belongsToMany(db.BacType, {
  through: db.StudentBacType, foreignKey: 'studentProfileId', otherKey: 'bacTypeId', as: 'bacTypes'
});
db.BacType.belongsToMany(db.StudentProfile, {
  through: db.StudentBacType, foreignKey: 'bacTypeId', otherKey: 'studentProfileId', as: 'studentProfiles'
});
db.TutorProfile.belongsToMany(db.Language, {
  through: db.TutorLanguage, foreignKey: 'tutorProfileId', otherKey: 'languageId', as: 'languages'
});
db.Language.belongsToMany(db.TutorProfile, {
  through: db.TutorLanguage, foreignKey: 'languageId', otherKey: 'tutorProfileId', as: 'tutorProfiles'
});
db.TutorProfile.belongsToMany(db.Subject, {
  through: db.TutorSubject, foreignKey: 'tutorProfileId', otherKey: 'subjectId', as: 'subjects'
});
db.Subject.belongsToMany(db.TutorProfile, {
  through: db.TutorSubject, foreignKey: 'subjectId', otherKey: 'tutorProfileId', as: 'tutorProfiles'
});
db.TutorProfile.belongsToMany(db.BacType, {
  through: db.TutorBacType, foreignKey: 'tutorProfileId', otherKey: 'bacTypeId', as: 'bacTypes'
});
db.BacType.belongsToMany(db.TutorProfile, {
  through: db.TutorBacType, foreignKey: 'bacTypeId', otherKey: 'tutorProfileId', as: 'tutorProfiles'
});

// Associations (Phase 4)
db.User.hasMany(db.Purchase, { foreignKey: 'studentId', as: 'purchases' });
db.Purchase.belongsTo(db.User, { foreignKey: 'studentId', as: 'student' });

db.Purchase.belongsTo(db.Bundle, { foreignKey: 'bundleId', as: 'bundle' });
db.Purchase.belongsTo(db.SessionType, { foreignKey: 'sessionTypeId', as: 'sessionType' });

db.Purchase.hasMany(db.PaymentTransaction, { foreignKey: 'purchaseId', as: 'payments', onDelete: 'CASCADE' });
db.PaymentTransaction.belongsTo(db.Purchase, { foreignKey: 'purchaseId', as: 'purchase' });


// Associations (Phase 5)
db.Purchase.hasOne(db.Assignment, { foreignKey: 'purchaseId', as: 'assignment', onDelete: 'CASCADE' });
db.Assignment.belongsTo(db.Purchase, { foreignKey: 'purchaseId', as: 'purchase' });

db.User.hasMany(db.Assignment, { foreignKey: 'studentId', as: 'studentAssignments' });
db.User.hasMany(db.Assignment, { foreignKey: 'tutorId', as: 'tutorAssignments' });
db.Assignment.belongsTo(db.User, { foreignKey: 'studentId', as: 'student' });
db.Assignment.belongsTo(db.User, { foreignKey: 'tutorId', as: 'tutor' });
db.Assignment.belongsTo(db.User, { foreignKey: 'assignedBy', as: 'assignedByUser' });

db.Purchase.hasMany(db.TutorChangeRequest, { foreignKey: 'purchaseId', as: 'tutorChangeRequests', onDelete: 'CASCADE' });
db.TutorChangeRequest.belongsTo(db.Purchase, { foreignKey: 'purchaseId', as: 'purchase' });
db.User.hasMany(db.TutorChangeRequest, { foreignKey: 'studentId', as: 'tutorChangeRequests' });
db.TutorChangeRequest.belongsTo(db.User, { foreignKey: 'studentId', as: 'student' });
db.TutorChangeRequest.belongsTo(db.User, { foreignKey: 'handledBy', as: 'handledByUser' });

// Phase 6 Associations (Calendar)
db.CalendarEvent.belongsTo(db.User, { foreignKey: 'studentId', as: 'student' });
db.CalendarEvent.belongsTo(db.User, { foreignKey: 'tutorId',   as: 'tutor' });
db.CalendarEvent.belongsTo(db.User, { foreignKey: 'createdBy', as: 'creator' });
db.CalendarEvent.belongsTo(db.Subject, { foreignKey: 'subjectId', as: 'subject' });
db.CalendarEvent.belongsTo(db.Purchase, { foreignKey: 'purchaseId', as: 'purchase' });
db.CalendarEvent.belongsTo(db.CalendarEvent, { foreignKey: 'rescheduleOf', as: 'parentEvent' });

// Phase 7 Associations — sessions
db.Session.belongsTo(db.User, { foreignKey: 'studentId', as: 'student' });
db.Session.belongsTo(db.User, { foreignKey: 'tutorId', as: 'tutor' });
db.Session.belongsTo(db.Subject, { foreignKey: 'subjectId', as: 'subject' });
db.Session.belongsTo(db.Purchase, { foreignKey: 'purchaseId', as: 'purchase' });
db.Session.belongsTo(db.CalendarEvent, { foreignKey: 'calendarEventId', as: 'calendarEvent' });
db.Session.hasMany(db.SessionTiming, { foreignKey: 'sessionId', as: 'timings', onDelete: 'CASCADE' });
db.Session.hasOne(db.Timesheet, {
    foreignKey: 'sessionId',
    as: 'timesheets',
    onDelete: 'CASCADE'
});

// Consumption
db.Consumption.belongsTo(db.Purchase, { foreignKey: 'purchaseId', as: 'purchase' });
db.Consumption.belongsTo(db.Session,  { foreignKey: 'sessionId',  as: 'session' });

// Timesheet
db.Timesheet.belongsTo(db.User, { foreignKey: 'tutorId', as: 'tutor' });
db.Timesheet.belongsTo(db.Session, { foreignKey: 'sessionId', as: 'session' });

// Feedback
db.Feedback.belongsTo(db.Session, { foreignKey: 'sessionId', as: 'session' });
db.Feedback.belongsTo(db.User, { foreignKey: 'byUserId', as: 'byUser' });

// Support messages
db.User.hasMany(db.SupportMessage, { foreignKey: 'userId', as: 'supportMessages', onDelete: 'CASCADE' });
db.SupportMessage.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });

db.Purchase.hasMany(db.CalendarEvent, {
    foreignKey: 'purchaseId',
    as: 'calendarEvents',
    onDelete: 'CASCADE',
    hooks: true
});

db.User.hasMany(db.CalendarEvent, { foreignKey: 'studentId', as: 'studentCalendarEvents' });
db.User.hasMany(db.CalendarEvent, { foreignKey: 'tutorId',   as: 'tutorCalendarEvents' });
db.User.hasMany(db.CalendarEvent, { foreignKey: 'createdBy', as: 'createdCalendarEvents' });

db.Purchase.hasMany(db.Session, { foreignKey: 'purchaseId', as: 'sessions' });
db.Purchase.hasMany(db.Consumption, { foreignKey: 'purchaseId', as: 'consumptions' });

module.exports = db;

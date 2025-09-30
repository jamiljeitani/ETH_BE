// models/CalendarEvent.js
module.exports = (sequelize, DataTypes) => {
  const CalendarEvent = sequelize.define(
    "CalendarEvent",
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

      // Display metadata
      title: { type: DataTypes.STRING, allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true },

      // Classification
      type: {
        type: DataTypes.ENUM("session", "exam", "target", "other"),
        allowNull: false,
        defaultValue: "session",
      },
      status: {
        type: DataTypes.ENUM("proposed", "accepted", "rejected", "cancelled", "rescheduled"),
        allowNull: false,
        defaultValue: "proposed",
      },

      // Timing (ISO datetimes)
      startAt: { type: DataTypes.DATE, allowNull: false },
      endAt: { type: DataTypes.DATE, allowNull: false },

      // Location
      locationType: { type: DataTypes.ENUM("online", "in-person"), allowNull: true },
      locationDetails: { type: DataTypes.STRING, allowNull: true },

      // 🔗 Optional online meeting link (Zoom/Meet/Teams, etc.)
      meetingUrl: { type: DataTypes.STRING(2048), allowNull: true },

      // Relations
      studentId: { type: DataTypes.UUID, allowNull: false }, // -> users.id (role: student)
      tutorId: { type: DataTypes.UUID, allowNull: false }, // -> users.id (role: tutor)
      createdBy: { type: DataTypes.UUID, allowNull: false }, // -> users.id (who proposed)

      subjectId: { type: DataTypes.UUID, allowNull: true }, // -> subjects.id (optional)
      purchaseId: { type: DataTypes.UUID, allowNull: true }, // -> purchases.id (optional)

      // Rescheduling chain
      rescheduleOf: { type: DataTypes.UUID, allowNull: true }, // -> calendar_events.id (parent)
      decisionReason: { type: DataTypes.TEXT, allowNull: true }, // reason when rejected/cancelled/rescheduled
    },
    {
      tableName: "calendar_events",
      underscored: false,
      indexes: [
        { fields: ["studentId"] },
        { fields: ["tutorId"] },
        { fields: ["startAt"] },
        { fields: ["status"] },
      ],
      validate: {
        endAfterStart() {
          if (this.startAt && this.endAt && new Date(this.endAt) <= new Date(this.startAt)) {
            throw new Error("endAt must be after startAt");
          }
        },
      },
    }
  );

  return CalendarEvent;
};

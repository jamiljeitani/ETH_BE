// models/TutorProfile.js
module.exports = (sequelize, DataTypes) => {
  const TutorProfile = sequelize.define('TutorProfile', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false, unique: true },

    fullName: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: true }, 
    dob: { type: DataTypes.DATEONLY, allowNull: false },
    address: { type: DataTypes.STRING, allowNull: false },

    educationLevel: { type: DataTypes.STRING, allowNull: false },
    availabilityHoursPerWeek: { type: DataTypes.INTEGER, allowNull: false },

    tutoringType: { type: DataTypes.ENUM('online', 'in-person', 'hybrid'), allowNull: false },
    payoutMethod: { type: DataTypes.STRING, allowNull: false },

    rankId: { type: DataTypes.UUID, allowNull: true }, // TutorRank
    idDocumentUrl: { type: DataTypes.STRING, allowNull: true },
    profilePictureUrl: { type: DataTypes.STRING, allowNull: true },

    preferredGradesText: { type: DataTypes.STRING, allowNull: true }
  }, {
    tableName: 'tutor_profiles',
    indexes: [{ fields: ['userId'], unique: true }]
  });

  return TutorProfile;
};

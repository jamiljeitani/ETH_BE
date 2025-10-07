// models/StudentProfile.js
module.exports = (sequelize, DataTypes) => {
  const StudentProfile = sequelize.define('StudentProfile', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false, unique: true },

    fullName: { type: DataTypes.STRING, allowNull: false },
    guardianName: { type: DataTypes.STRING, allowNull: false },
    guardianPhone: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: true },

    dob: { type: DataTypes.DATEONLY, allowNull: false },
    address: { type: DataTypes.STRING, allowNull: false },
    school: { type: DataTypes.STRING, allowNull: false },
    gradeId: { type: DataTypes.UUID, allowNull: false },

    profilePictureUrl: { type: DataTypes.STRING, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true }
  }, {
    tableName: 'student_profiles',
    indexes: [{ fields: ['userId'], unique: true }]
  });

  return StudentProfile;
};

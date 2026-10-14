'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class DoctorProfile extends Model {
    static associate(models) {
      DoctorProfile.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }
  DoctorProfile.init({
    userId: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    age: { type: DataTypes.INTEGER, allowNull: false },
    gender: { type: DataTypes.ENUM('Male', 'Female', 'Other'), allowNull: false },
    panCard: { type: DataTypes.STRING, allowNull: false },
    aadhaarCard: { type: DataTypes.STRING, allowNull: false },
    registrationNumber: { type: DataTypes.STRING, allowNull: true },
    registrationFileUrl: { type: DataTypes.STRING, allowNull: true },
    mbbsDegreeFileUrl: { type: DataTypes.STRING, allowNull: true },
    pgDegreeFileUrl: { type: DataTypes.STRING, allowNull: true },
    signatureFileUrl: { type: DataTypes.STRING, allowNull: true },
    degreeFileUrl: { type: DataTypes.STRING, allowNull: true },
    address: { type: DataTypes.TEXT, allowNull: false },
    phoneNumber: { type: DataTypes.STRING, allowNull: false },
    reportFee: { type: DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: 0 }
  }, {
    sequelize,
    modelName: 'DoctorProfile',
  });
  return DoctorProfile;
};
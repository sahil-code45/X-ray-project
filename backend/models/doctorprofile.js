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
    degreeFileUrl: { type: DataTypes.STRING, allowNull: false },
    address: { type: DataTypes.TEXT, allowNull: false },
    phoneNumber: { type: DataTypes.STRING, allowNull: false },
    reportFee: { type: DataTypes.DECIMAL(10, 2), allowNull: false }
  }, {
    sequelize,
    modelName: 'DoctorProfile',
  });
  return DoctorProfile;
};
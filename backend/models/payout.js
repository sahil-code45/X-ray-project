'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Payout extends Model {
    static associate(models) {
      Payout.belongsTo(models.User, { foreignKey: 'doctorId', as: 'doctor' });
      // or Payout.belongsTo(models.DoctorProfile, { foreignKey: 'doctorId', targetKey: 'userId', as: 'doctorProfile' })
      Payout.belongsTo(models.XrayCase, { foreignKey: 'caseId', as: 'xrayCase' });
    }
  }
  Payout.init({
    doctorId: DataTypes.INTEGER,
    caseId: DataTypes.INTEGER,
    amount: DataTypes.DECIMAL,
    status: { type: DataTypes.STRING, defaultValue: 'pending' },
    transactionRef: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Payout',
  });
  return Payout;
};
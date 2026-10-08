'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class XrayCase extends Model {
    static associate(models) {
      XrayCase.belongsTo(models.User, { foreignKey: 'assignedDoctorId', as: 'doctor' });
      XrayCase.belongsTo(models.User, { foreignKey: 'centerId', as: 'center' });
      XrayCase.hasOne(models.Report, { foreignKey: 'caseId', as: 'report' });
    }
  }
  XrayCase.init({
    patientId: DataTypes.STRING,
    patientName: DataTypes.STRING,
    patientAge: DataTypes.INTEGER,
    patientGender: DataTypes.STRING,
    studyNotes: DataTypes.TEXT,
    dicomFileUrl: DataTypes.STRING,
    assignedDoctorId: DataTypes.INTEGER,
    centerId: DataTypes.INTEGER,
    status: DataTypes.STRING,
    lockedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'XrayCase',
  });
  return XrayCase;
};
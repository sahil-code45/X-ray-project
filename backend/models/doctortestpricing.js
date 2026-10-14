'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DoctorTestPricing extends Model {
    static associate(models) {
      DoctorTestPricing.belongsTo(models.User, { foreignKey: 'doctorId', as: 'doctor' });
    }
  }

  DoctorTestPricing.init({
    doctorId: {
      type: DataTypes.INTEGER,
      allowNull: true // null indicates standard/default rate across all doctors
    },
    modality: {
      type: DataTypes.STRING,
      allowNull: false
    },
    testName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    }
  }, {
    sequelize,
    modelName: 'DoctorTestPricing',
  });

  return DoctorTestPricing;
};


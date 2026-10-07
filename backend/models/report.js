'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Report extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Report.init({
    caseId: DataTypes.INTEGER,
    doctorId: DataTypes.INTEGER,
    clinicalFindings: DataTypes.TEXT,
    impression: DataTypes.TEXT,
    recommendations: DataTypes.TEXT,
    pdfUrl: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Report',
  });
  return Report;
};
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('XrayCases');
    if (!tableInfo.patientId) {
      await queryInterface.addColumn('XrayCases', 'patientId', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('XrayCases');
    if (tableInfo.patientId) {
      await queryInterface.removeColumn('XrayCases', 'patientId');
    }
  }
};


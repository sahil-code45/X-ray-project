'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('XrayCases', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      patientName: {
        type: Sequelize.STRING
      },
      patientAge: {
        type: Sequelize.INTEGER
      },
      patientGender: {
        type: Sequelize.STRING
      },
      studyNotes: {
        type: Sequelize.TEXT
      },
      dicomFileUrl: {
        type: Sequelize.STRING
      },
      assignedDoctorId: {
        type: Sequelize.INTEGER
      },
      status: {
        type: Sequelize.STRING
      },
      lockedAt: {
        type: Sequelize.DATE
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('XrayCases');
  }
};
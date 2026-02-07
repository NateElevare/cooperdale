'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // MEMBERS
    await queryInterface.addColumn('members', 'createdAt', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    });
    await queryInterface.addColumn('members', 'updatedAt', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    });

    // EVENTS
    await queryInterface.addColumn('events', 'createdAt', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    });
    await queryInterface.addColumn('events', 'updatedAt', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    });

    // ATTENDANCE
    await queryInterface.addColumn('attendance', 'createdAt', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    });
    await queryInterface.addColumn('attendance', 'updatedAt', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('members', 'createdAt');
    await queryInterface.removeColumn('members', 'updatedAt');

    await queryInterface.removeColumn('events', 'createdAt');
    await queryInterface.removeColumn('events', 'updatedAt');

    await queryInterface.removeColumn('attendance', 'createdAt');
    await queryInterface.removeColumn('attendance', 'updatedAt');
  },
};

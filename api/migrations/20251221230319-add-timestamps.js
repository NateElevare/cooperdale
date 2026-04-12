'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Timestamps are already included in the create-member, create-event,
    // and create-attendance migrations. This migration is a no-op.
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

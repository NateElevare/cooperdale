'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addConstraint('members', {
      fields: ['firstName', 'lastName', 'birthDate'],
      type: 'unique',
      name: 'uniq_member_identity',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('members', 'uniq_member_identity');
  },
};

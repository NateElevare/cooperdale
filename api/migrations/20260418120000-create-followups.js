'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('followups', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      memberId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'members', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      followedUpAt: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      followedUpBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('followups', ['memberId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('followups');
  },
};

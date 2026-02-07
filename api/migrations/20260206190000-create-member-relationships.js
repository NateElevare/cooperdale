'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('member_relationships', {
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
      relatedMemberId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'members', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      relationType: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      notes: {
        type: Sequelize.STRING,
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

    await queryInterface.addIndex('member_relationships', ['memberId']);
    await queryInterface.addIndex('member_relationships', ['relatedMemberId']);
    await queryInterface.addConstraint('member_relationships', {
      fields: ['memberId', 'relatedMemberId', 'relationType'],
      type: 'unique',
      name: 'uniq_member_relationship',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('member_relationships');
  },
};

'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MemberRelationship extends Model {
    static associate(models) {
      MemberRelationship.belongsTo(models.Member, {
        foreignKey: 'memberId',
        as: 'member',
      });
      MemberRelationship.belongsTo(models.Member, {
        foreignKey: 'relatedMemberId',
        as: 'relatedMember',
      });
    }
  }

  MemberRelationship.init(
    {
      memberId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      relatedMemberId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      relationType: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      notes: {
        type: DataTypes.STRING,
      },
    },
    {
      sequelize,
      modelName: 'MemberRelationship',
      tableName: 'member_relationships',
      freezeTableName: true,
      timestamps: true,
    }
  );

  return MemberRelationship;
};

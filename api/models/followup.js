'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Followup extends Model {
    static associate(models) {
      Followup.belongsTo(models.Member, { foreignKey: 'memberId', as: 'member' });
      Followup.belongsTo(models.User, { foreignKey: 'followedUpBy', as: 'followedUpByUser' });
    }
  }

  Followup.init({
    memberId: DataTypes.INTEGER,
    notes: DataTypes.TEXT,
    followedUpAt: DataTypes.DATEONLY,
    followedUpBy: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'Followup',
    tableName: 'followups',
    freezeTableName: true,
    timestamps: true,
  });

  return Followup;
};

'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Event extends Model {
    static associate(models) {
      Event.hasMany(models.Attendance, {
        foreignKey: 'eventId',
        onDelete: 'CASCADE',
      });

      Event.belongsToMany(models.Member, {
        through: models.Attendance,
        foreignKey: 'eventId',
        otherKey: 'memberId',
      });
    }
  }

  Event.init(
    {
      name: DataTypes.STRING,
      type: DataTypes.STRING,
      date: DataTypes.DATEONLY,
    },
    {
      sequelize,
      modelName: 'Event',
      tableName: 'events',     
      freezeTableName: true,   
      timestamps: true,       
    }
  );

  return Event;
};
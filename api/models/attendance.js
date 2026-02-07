'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Attendance extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Attendance.belongsTo(models.Member, { foreignKey: 'memberId' });
      Attendance.belongsTo(models.Event, { foreignKey: 'eventId' });
    }
  }
  Attendance.init({
    memberId: DataTypes.INTEGER,
    eventId: DataTypes.INTEGER,
    date: DataTypes.DATEONLY
  }, {
    sequelize,
    modelName: 'Attendance',
    tableName: 'attendance',
    timestamps: true,
    freezeTableName: true,
  });

  Attendance.associate = (models) => {
    Attendance.belongsTo(models.Member, { foreignKey: 'memberId' });
    Attendance.belongsTo(models.Event, { foreignKey: 'eventId' });
  };
  return Attendance;
};
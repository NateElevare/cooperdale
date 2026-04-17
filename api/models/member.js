'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Member extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Member.hasMany(models.Attendance, { foreignKey: 'memberId', onDelete: 'CASCADE' });
      Member.belongsToMany(models.Event, { through: models.Attendance, foreignKey: 'memberId', otherKey: 'eventId' });
      Member.hasMany(models.MemberRelationship, {
        foreignKey: 'memberId',
        as: 'sourceRelationships',
        onDelete: 'CASCADE',
      });
      Member.hasMany(models.MemberRelationship, {
        foreignKey: 'relatedMemberId',
        as: 'targetRelationships',
        onDelete: 'CASCADE',
      });
    }
  }
  Member.init({
    name: DataTypes.STRING,
    firstName: DataTypes.STRING,
    lastName: DataTypes.STRING,
    email: DataTypes.STRING,
    phone: DataTypes.STRING,
    birthDate: DataTypes.DATEONLY,
    joinDate: DataTypes.DATEONLY,
    membershipDate: DataTypes.DATEONLY,
    isMember: DataTypes.BOOLEAN,
    baptized: DataTypes.BOOLEAN,
    baptismDate: DataTypes.DATEONLY,
    street: DataTypes.STRING,
    city: DataTypes.STRING,
    state: DataTypes.STRING,
    zip: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Member',
    tableName: 'members',
    freezeTableName: true,
    timestamps: true,
  });
  return Member;
};

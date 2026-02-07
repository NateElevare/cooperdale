'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Message extends Model {
    static associate(models) {
      Message.belongsTo(models.User, {
        foreignKey: 'senderUserId',
        as: 'sender',
      });
      Message.belongsTo(models.User, {
        foreignKey: 'recipientUserId',
        as: 'recipient',
      });
    }
  }

  Message.init(
    {
      senderUserId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      recipientUserId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      body: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      readAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Message',
      tableName: 'messages',
      freezeTableName: true,
      timestamps: true,
    }
  );

  return Message;
};

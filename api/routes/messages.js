const express = require('express');
const { Op } = require('sequelize');
const router = express.Router();

const { Message, User } = require('../models');
const { logError } = require('../utils/logger');

const MAX_BODY_LENGTH = 2000;
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 250;

function sanitizeMessage(message) {
  return {
    id: message.id,
    senderUserId: message.senderUserId,
    recipientUserId: message.recipientUserId,
    body: message.body,
    readAt: message.readAt,
    createdAt: message.createdAt,
  };
}

router.get('/users', async (req, res) => {
  try {
    const users = await User.findAll({
      where: {
        isActive: true,
        id: { [Op.ne]: req.auth.sub },
      },
      attributes: ['id', 'username', 'displayName'],
      order: [['displayName', 'ASC'], ['username', 'ASC']],
    });
    res.json(users);
  } catch (e) {
    logError(e);
    res.status(500).json({ error: 'Failed to fetch message users' });
  }
});

router.get('/thread/:otherUserId', async (req, res) => {
  try {
    const me = req.auth.sub;
    const otherUserId = Number(req.params.otherUserId);
    const parsedLimit = Number(req.query.limit);
    const limit = Number.isFinite(parsedLimit)
      ? Math.max(1, Math.min(MAX_LIMIT, Math.floor(parsedLimit)))
      : DEFAULT_LIMIT;

    if (!Number.isFinite(otherUserId)) {
      return res.status(400).json({ error: 'Invalid otherUserId' });
    }

    const otherUser = await User.findByPk(otherUserId, {
      attributes: ['id', 'isActive'],
    });
    if (!otherUser || !otherUser.isActive) {
      return res.status(404).json({ error: 'User not found' });
    }

    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderUserId: me, recipientUserId: otherUserId },
          { senderUserId: otherUserId, recipientUserId: me },
        ],
      },
      order: [['createdAt', 'ASC']],
      limit,
    });

    await Message.update(
      { readAt: new Date() },
      {
        where: {
          senderUserId: otherUserId,
          recipientUserId: me,
          readAt: null,
        },
      }
    );

    res.json(messages.map(sanitizeMessage));
  } catch (e) {
    logError(e);
    res.status(500).json({ error: 'Failed to fetch thread' });
  }
});

router.post('/', async (req, res) => {
  try {
    const senderUserId = req.auth.sub;
    const recipientUserId = Number(req.body.recipientUserId);
    const body = String(req.body.body || '').trim();

    if (!Number.isFinite(recipientUserId)) {
      return res.status(400).json({ error: 'recipientUserId is required' });
    }
    if (recipientUserId === senderUserId) {
      return res.status(400).json({ error: 'You cannot message yourself' });
    }
    if (!body) {
      return res.status(400).json({ error: 'Message body is required' });
    }
    if (body.length > MAX_BODY_LENGTH) {
      return res.status(400).json({ error: `Message must be ${MAX_BODY_LENGTH} characters or less` });
    }

    const recipient = await User.findByPk(recipientUserId, {
      attributes: ['id', 'isActive'],
    });
    if (!recipient || !recipient.isActive) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    const message = await Message.create({
      senderUserId,
      recipientUserId,
      body,
    });

    res.status(201).json(sanitizeMessage(message));
  } catch (e) {
    logError(e);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;

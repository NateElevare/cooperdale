'use strict';

const express = require('express');
const router = express.Router();
const { Followup, Member, User } = require('../models');
const { logError } = require('../utils/logger');

router.get('/', async (req, res) => {
  try {
    const followups = await Followup.findAll({
      include: [
        { model: Member, as: 'member', attributes: ['id', 'name', 'firstName', 'lastName'] },
        { model: User, as: 'followedUpByUser', attributes: ['id', 'displayName'] },
      ],
      order: [['followedUpAt', 'DESC'], ['id', 'DESC']],
    });
    res.json(followups);
  } catch (e) {
    logError(e);
    res.status(500).json({ error: 'Failed to fetch follow-ups' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { memberId, notes, followedUpAt, followedUpBy } = req.body;

    if (!memberId || !followedUpAt) {
      return res.status(400).json({ error: 'memberId and followedUpAt are required' });
    }

    const followup = await Followup.create({ memberId, notes, followedUpAt, followedUpBy: followedUpBy || null });
    res.json({ id: followup.id });
  } catch (e) {
    logError(e);
    res.status(500).json({ error: 'Failed to create follow-up' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });

    const deleted = await Followup.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ error: 'Follow-up not found' });

    res.json({ success: true });
  } catch (e) {
    logError(e);
    res.status(500).json({ error: 'Failed to delete follow-up' });
  }
});

module.exports = router;

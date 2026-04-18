const express = require('express');
const router = express.Router();

const { Event, Attendance } = require('../models');
const { toIsoDateOnly } = require('../utils/dateOnly');
const { requirePermission } = require('../middleware/auth');
const { logError } = require('../utils/logger');

router.get('/', requirePermission('events', 'read'), async (req, res) => {
  try {
    const events = await Event.findAll({
      order: [
        ['date', 'DESC'],
        ['id', 'DESC'],
      ],
    });

    res.json(events);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

router.post('/', requirePermission('events', 'write'), async (req, res) => {
  try {
    const { name, type } = req.body;
    const date = toIsoDateOnly(req.body.date);

    if (!name || !type || !date) {
      return res.status(400).json({ error: 'name, type, and date are required' });
    }

    if (req.body.date && !date) {
      return res.status(400).json({ error: 'date must be YYYY-MM-DD or MM/DD/YYYY' });
    }

    const event = await Event.create({ name, type, date });

    res.json({ id: event.id });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

router.put('/:id', requirePermission('events', 'write'), async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    if (!Number.isFinite(eventId)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const payload = {
      name: req.body.name,
      type: req.body.type,
      date: toIsoDateOnly(req.body.date),
    };

    if (req.body.date && !payload.date) {
      return res.status(400).json({ error: 'date must be YYYY-MM-DD or MM/DD/YYYY' });
    }

    const [updatedCount] = await Event.update(payload, { where: { id: eventId } });

    if (updatedCount === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ success: true });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

router.delete('/:id', requirePermission('events', 'write'), async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    if (!Number.isFinite(eventId)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const deletedCount = await Event.destroy({ where: { id: eventId } });

    if (deletedCount === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await Attendance.destroy({ where: { eventId } });

    res.json({ success: true });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

module.exports = router;

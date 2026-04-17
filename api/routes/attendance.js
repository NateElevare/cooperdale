const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const { Attendance, Member, Event } = require('../models');
const { toIsoDateOnly } = require('../utils/dateOnly');
const { requirePermission } = require('../middleware/auth');

function logError(...args) {
  const line = `[${new Date().toISOString()}] ERROR: ${args.map(a => a instanceof Error ? a.stack : String(a)).join(' ')}\n`;
  try { fs.appendFileSync(path.join(__dirname, '../debug.log'), line); } catch(_) {}
  console.error(line);
}

router.get('/', requirePermission('attendance', 'read'), async (req, res) => {
  try {
    const attendance = await Attendance.findAll({
      // Optional: include details so the UI doesn't have to join client-side
      // Remove include if you only want raw IDs
      include: [
        { model: Member, attributes: ['id', 'firstName', 'lastName', 'name'] },
        { model: Event, attributes: ['id', 'name', 'type', 'date'] },
      ],
      order: [
        ['date', 'DESC'],
        ['id', 'DESC'],
      ],
    });

    res.json(attendance);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

router.post('/', requirePermission('attendance', 'write'), async (req, res) => {
  try {
    const mId = Number(req.body.memberId);
    const eId = Number(req.body.eventId);
    const date = toIsoDateOnly(req.body.date);

    if (!Number.isFinite(mId) || !Number.isFinite(eId) || !date) {
      return res.status(400).json({
        error: 'memberId, eventId, and date are required (date must be YYYY-MM-DD or MM/DD/YYYY)',
      });
    }

    if (req.body.date && !date) {
      return res.status(400).json({ error: 'date must be YYYY-MM-DD or MM/DD/YYYY' });
    }

    // Verify FK targets exist (recommended)
    const [member, event] = await Promise.all([
      Member.findByPk(mId),
      Event.findByPk(eId),
    ]);

    if (!member) return res.status(400).json({ error: `Member ${mId} not found` });
    if (!event) return res.status(400).json({ error: `Event ${eId} not found` });

    // Prevent duplicates (requires UNIQUE constraint to be truly race-safe)
    const [record, created] = await Attendance.findOrCreate({
      where: { memberId: mId, eventId: eId, date },
      defaults: { memberId: mId, eventId: eId, date },
    });

    if (!created) {
      return res.status(409).json({
        error: 'Attendance record already exists',
        attendanceId: record.id,
      });
    }

    res.json({ id: record.id });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Attendance record already exists' });
    }
    logError(err);
    res.status(500).json({ error: 'Failed to create attendance record' });
  }
});

router.delete('/:id', requirePermission('attendance', 'write'), async (req, res) => {
  try {
    const attendanceId = Number(req.params.id);
    if (!Number.isFinite(attendanceId)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const deletedCount = await Attendance.destroy({ where: { id: attendanceId } });

    if (deletedCount === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    res.json({ success: true });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: 'Failed to delete attendance record' });
  }
});

module.exports = router;

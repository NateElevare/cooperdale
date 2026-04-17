const express = require('express');
const router = express.Router();

const { Member, Attendance, MemberRelationship } = require('../models');
const { toIsoDateOnly } = require('../utils/dateOnly');
const { requirePermission } = require('../middleware/auth');
const normalizeName = (s) => (s || '').trim();
const { logError } = require('../utils/logger');

const RELATION_TYPES = [
  'spouse',
  'parent',
  'child',
  'sibling',
  'guardian',
  'ward',
  'grandparent',
  'grandchild',
  'other',
];

const INVERSE_RELATION = {
  spouse: 'spouse',
  parent: 'child',
  child: 'parent',
  sibling: 'sibling',
  guardian: 'ward',
  ward: 'guardian',
  grandparent: 'grandchild',
  grandchild: 'grandparent',
  other: 'other',
};

function normalizeMemberDates(body) {
  return {
    birthDate: toIsoDateOnly(body.birthDate),
    joinDate: toIsoDateOnly(body.joinDate),
    membershipDate: toIsoDateOnly(body.membershipDate),
    baptismDate: toIsoDateOnly(body.baptismDate),
  };
}

router.get('/', requirePermission('members', 'read'), async (req, res) => {
  try {
    const members = await Member.findAll({ order: [['id', 'DESC']] });
    res.json(members);
  } catch (e) {
    logError(e);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

router.post('/', requirePermission('members', 'write'), async (req, res) => {
  try {
    const dates = normalizeMemberDates(req.body);

    // If any date was provided but is invalid, reject early
    for (const key of Object.keys(dates)) {
      if (req.body[key] && !dates[key]) {
        return res
          .status(400)
          .json({ error: `${key} must be YYYY-MM-DD or MM/DD/YYYY` });
      }
    }

    const payload = {
      ...req.body,
      ...dates,
      baptized: !!req.body.baptized,
    };

    const firstName = normalizeName(payload.firstName);
    const lastName = normalizeName(payload.lastName);
    const birthDate = payload.birthDate;

    if (!firstName || !lastName) {
      return res.status(400).json({
        error: 'firstName and lastName are required to create a member',
      });
    }

    const [member, created] = await Member.findOrCreate({
      where: { firstName, lastName, birthDate },
      defaults: {
        ...payload,
        firstName,
        lastName,
      },
    });

    if (!created) {
      return res.status(409).json({
        error: 'Member already exists',
        memberId: member.id,
      });
    }

    res.json({ id: member.id });
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Member already exists' });
    }
    logError(e);
    res.status(500).json({ error: 'Failed to create member' });
  }
});

router.get('/:id/relationships', requirePermission('members', 'read'), async (req, res) => {
  try {
    const memberId = Number(req.params.id);
    if (!Number.isFinite(memberId)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const outgoing = await MemberRelationship.findAll({
      where: { memberId },
      attributes: ['id', 'memberId', 'relatedMemberId', 'relationType', 'notes'],
    });

    const outgoingKeySet = new Set(
      outgoing.map((rel) => `${rel.relatedMemberId}:${rel.relationType}`)
    );

    const incoming = await MemberRelationship.findAll({
      where: { relatedMemberId: memberId },
      attributes: ['id', 'memberId', 'relatedMemberId', 'relationType', 'notes'],
    });

    // Backfill missing inverse links so either profile view shows the relationship.
    await Promise.all(
      incoming.map(async (rel) => {
        const inverse = INVERSE_RELATION[rel.relationType] || rel.relationType;
        const reciprocalKey = `${rel.memberId}:${inverse}`;
        if (outgoingKeySet.has(reciprocalKey)) return;

        await MemberRelationship.findOrCreate({
          where: {
            memberId,
            relatedMemberId: rel.memberId,
            relationType: inverse,
          },
          defaults: {
            memberId,
            relatedMemberId: rel.memberId,
            relationType: inverse,
          },
        });
      })
    );

    const relationships = await MemberRelationship.findAll({
      where: { memberId },
      include: [
        {
          model: Member,
          as: 'relatedMember',
          attributes: ['id', 'name', 'firstName', 'lastName', 'email'],
        },
      ],
      order: [['relationType', 'ASC'], ['id', 'ASC']],
    });

    res.json(relationships);
  } catch (e) {
    logError(e);
    res.status(500).json({ error: 'Failed to fetch relationships' });
  }
});

router.post('/:id/relationships', requirePermission('members', 'write'), async (req, res) => {
  try {
    const memberId = Number(req.params.id);
    const relatedMemberId = Number(req.body.relatedMemberId);
    const relationType = String(req.body.relationType || '').trim().toLowerCase();
    const reciprocal = req.body.reciprocal !== false;

    if (!Number.isFinite(memberId) || !Number.isFinite(relatedMemberId)) {
      return res.status(400).json({ error: 'memberId and relatedMemberId must be valid ids' });
    }
    if (memberId === relatedMemberId) {
      return res.status(400).json({ error: 'A member cannot be related to themselves' });
    }
    if (!RELATION_TYPES.includes(relationType)) {
      return res.status(400).json({ error: 'Invalid relationType' });
    }

    const [member, relatedMember] = await Promise.all([
      Member.findByPk(memberId),
      Member.findByPk(relatedMemberId),
    ]);

    if (!member || !relatedMember) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const [relationship] = await MemberRelationship.findOrCreate({
      where: { memberId, relatedMemberId, relationType },
      defaults: {
        memberId,
        relatedMemberId,
        relationType,
        notes: req.body.notes || null,
      },
    });

    if (reciprocal) {
      const inverse = INVERSE_RELATION[relationType] || relationType;
      await MemberRelationship.findOrCreate({
        where: {
          memberId: relatedMemberId,
          relatedMemberId: memberId,
          relationType: inverse,
        },
        defaults: {
          memberId: relatedMemberId,
          relatedMemberId: memberId,
          relationType: inverse,
        },
      });
    }

    res.json({ id: relationship.id });
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Relationship already exists' });
    }
    logError(e);
    res.status(500).json({ error: 'Failed to create relationship' });
  }
});

router.delete('/:id/relationships/:relationshipId', requirePermission('members', 'write'), async (req, res) => {
  try {
    const memberId = Number(req.params.id);
    const relationshipId = Number(req.params.relationshipId);
    const reciprocal = req.query.reciprocal !== 'false';

    if (!Number.isFinite(memberId) || !Number.isFinite(relationshipId)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const relationship = await MemberRelationship.findOne({
      where: { id: relationshipId, memberId },
    });

    if (!relationship) {
      return res.status(404).json({ error: 'Relationship not found' });
    }

    const { relatedMemberId, relationType } = relationship;
    await relationship.destroy();

    if (reciprocal) {
      const inverse = INVERSE_RELATION[relationType] || relationType;
      await MemberRelationship.destroy({
        where: {
          memberId: relatedMemberId,
          relatedMemberId: memberId,
          relationType: inverse,
        },
      });
    }

    res.json({ success: true });
  } catch (e) {
    logError(e);
    res.status(500).json({ error: 'Failed to delete relationship' });
  }
});

router.put('/:id', requirePermission('members', 'write'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const dates = normalizeMemberDates(req.body);
    for (const key of Object.keys(dates)) {
      if (req.body[key] && !dates[key]) {
        return res
          .status(400)
          .json({ error: `${key} must be YYYY-MM-DD or MM/DD/YYYY` });
      }
    }

    const payload = {
      ...req.body,
      ...dates,
      baptized: !!req.body.baptized,
    };

    const [updatedCount] = await Member.update(payload, { where: { id } });

    if (updatedCount === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    res.json({ success: true });
  } catch (e) {
    logError(e);
    res.status(500).json({ error: 'Failed to update member' });
  }
});

router.delete('/:id', requirePermission('members', 'write'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    await Attendance.destroy({ where: { memberId: id } });

    const deletedCount = await Member.destroy({ where: { id } });
    if (deletedCount === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    res.json({ success: true });
  } catch (e) {
    logError(e);
    res.status(500).json({ error: 'Failed to delete member' });
  }
});

module.exports = router;

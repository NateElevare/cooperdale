'use strict';

process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const { Attendance, Member, Event } = require('./models');

async function run() {
  try {
    console.log('Testing basic attendance query...');
    const r1 = await Attendance.findAll();
    console.log('Basic query OK - rows:', r1.length);

    console.log('Testing attendance with Member include...');
    const r2 = await Attendance.findAll({
      include: [{ model: Member, attributes: ['id', 'firstName', 'lastName', 'name'] }],
    });
    console.log('Member include OK - rows:', r2.length);

    console.log('Testing attendance with Event include...');
    const r3 = await Attendance.findAll({
      include: [{ model: Event, attributes: ['id', 'name', 'type', 'date'] }],
    });
    console.log('Event include OK - rows:', r3.length);

    console.log('Testing attendance with both includes...');
    const r4 = await Attendance.findAll({
      include: [
        { model: Member, attributes: ['id', 'firstName', 'lastName', 'name'] },
        { model: Event, attributes: ['id', 'name', 'type', 'date'] },
      ],
      order: [['date', 'DESC'], ['id', 'DESC']],
    });
    console.log('Both includes OK - rows:', r4.length);
    console.log('ALL TESTS PASSED');
  } catch (e) {
    console.error('FAILED:', e.message);
    console.error(e);
  }
  process.exit(0);
}

run();

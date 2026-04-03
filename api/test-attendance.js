'use strict';

process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const { Attendance, Member, Event } = require('./models');

Attendance.findAll({
  include: [
    { model: Member, attributes: ['id', 'firstName', 'lastName', 'name'] },
    { model: Event, attributes: ['id', 'name', 'type', 'date'] },
  ],
})
  .then((r) => {
    console.log('OK - rows returned:', r.length);
    process.exit(0);
  })
  .catch((e) => {
    console.error('ERROR:', e.message);
    console.error(e);
    process.exit(1);
  });

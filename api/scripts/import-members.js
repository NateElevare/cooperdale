'use strict';

const path = require('path');
const XLSX = require('xlsx');
const { sequelize, Member } = require('../models');

const XLSX_PATH = path.join(__dirname, '../../Member list with dates and officers.xlsx');

// Strip family-group initials (2 uppercase letters) from the middle of a name.
// e.g. "Berry AA Amy" → { firstName: "Amy", lastName: "Berry" }
// e.g. "Mitchell Angie" → { firstName: "Angie", lastName: "Mitchell" }
function parseName(raw) {
  if (!raw) return null;
  const parts = raw.trim().split(/\s+/);
  if (parts.length < 2) return null;

  const lastName = parts[0];
  const firstName = parts[parts.length - 1];
  return { firstName, lastName };
}

function parseYear(val) {
  if (!val) return null;
  const n = parseInt(val, 10);
  if (!isNaN(n) && n > 1900 && n < 2100) return `${n}-01-01`;
  return null;
}

async function run() {
  const workbook = XLSX.readFile(XLSX_PATH);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const members = [];

  for (const row of rows) {
    // The name column header varies — try common names
    const rawName =
      row['Name'] || row['name'] || row['Member'] || row['MEMBER'] || '';

    if (!rawName || typeof rawName !== 'string' || !rawName.trim()) continue;

    const parsed = parseName(rawName.trim());
    if (!parsed) continue;

    const { firstName, lastName } = parsed;

    const joinDateRaw = row['Date Joined'] || row['date joined'] || '';
    const joinDate = parseYear(joinDateRaw);

    const inactiveRaw = String(row['Inactive'] || row['inactive'] || '').trim().toLowerCase();
    const isMember = inactiveRaw !== 'x';

    members.push({
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      joinDate,
      isMember,
      membershipDate: joinDate,
    });
  }

  console.log(`Parsed ${members.length} members from spreadsheet.`);

  await sequelize.authenticate();

  let created = 0;
  let skipped = 0;

  for (const m of members) {
    const exists = await Member.findOne({
      where: { firstName: m.firstName, lastName: m.lastName },
    });

    if (exists) {
      console.log(`  SKIP (already exists): ${m.firstName} ${m.lastName}`);
      skipped++;
      continue;
    }

    await Member.create(m);
    console.log(`  CREATED: ${m.firstName} ${m.lastName} (member=${m.isMember})`);
    created++;
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
  await sequelize.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

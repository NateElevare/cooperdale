'use strict';

/**
 * Imports attendance from "Attendence 2022 2023.xlsx".
 *
 * Row 4  : header — cols 3+ are Excel date serials
 * Row 5+ : member rows — col 0 = row number, col 1 = name, cols 3+ = "X"/"x"
 *
 * Usage:
 *   node api/scripts/import-attendance.js              # import, skip unmatched
 *   node api/scripts/import-attendance.js --dry-run    # preview only
 *   node api/scripts/import-attendance.js --create-missing  # create DB records for unmatched names
 */

const path = require('path');
const XLSX = require('xlsx');
const { sequelize, Member, Event, Attendance } = require('../models');

const XLSX_PATH = path.join(__dirname, '../../Attendence 2022 2023.xlsx');
const DRY_RUN = process.argv.includes('--dry-run');
const CREATE_MISSING = process.argv.includes('--create-missing');

function excelSerialToISO(serial) {
  const info = XLSX.SSF.parse_date_code(serial);
  return `${info.y}-${String(info.m).padStart(2, '0')}-${String(info.d).padStart(2, '0')}`;
}

function normalizeName(raw) {
  return String(raw || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function parseName(raw) {
  const trimmed = String(raw || '').trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  const lastName = parts[parts.length - 1];
  const firstName = parts.slice(0, parts.length - 1).join(' ');
  return { firstName, lastName };
}

function buildNameMap(members) {
  const map = new Map();
  for (const m of members) {
    const full = normalizeName(m.name);
    map.set(full, m);
    const computed = normalizeName(`${m.firstName} ${m.lastName}`);
    if (computed !== full) map.set(computed, m);
  }
  return map;
}

function findMember(nameMap, rawName) {
  const key = normalizeName(rawName);
  return nameMap.get(key) || null;
}

async function main() {
  if (DRY_RUN) console.log('=== DRY RUN — no changes will be written ===\n');
  if (CREATE_MISSING) console.log('=== --create-missing: unmatched names will be added to DB ===\n');

  const wb = XLSX.readFile(XLSX_PATH);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', header: 1 });

  const headerRow = rows[0]; // header is now row 0; data rows start at row 1
  const memberRows = rows.filter((r) => typeof r[0] === 'number' && r[0] > 0);

  // Build date list from header (cols 3+)
  const allDates = [];
  for (let i = 3; i < headerRow.length; i++) {
    const serial = headerRow[i];
    if (typeof serial === 'number' && serial > 0) {
      allDates.push({ colIdx: i, iso: excelSerialToISO(serial) });
    }
  }

  // Only keep dates that have at least one X
  const activeDates = allDates.filter(({ colIdx }) =>
    memberRows.some((r) => String(r[colIdx] || '').trim().toLowerCase() === 'x')
  );

  console.log(`Found ${activeDates.length} dates with attendance data`);
  console.log(`Dates: ${activeDates.map((d) => d.iso).join(', ')}\n`);

  await sequelize.authenticate();
  let allMembers = await Member.findAll();
  let nameMap = buildNameMap(allMembers);

  // Resolve (or create) a member for each spreadsheet row
  const rowMemberMap = new Map();
  const unmatched = [];

  for (const row of memberRows) {
    const rawName = String(row[1] || '').trim();
    if (!rawName) continue;

    let member = findMember(nameMap, rawName);

    if (!member) {
      if (CREATE_MISSING && !DRY_RUN) {
        const { firstName, lastName } = parseName(rawName);
        const fullName = `${firstName} ${lastName}`.trim();
        member = await Member.create({
          firstName,
          lastName,
          name: fullName,
          isMember: false,
        });
        nameMap.set(normalizeName(fullName), member);
        console.log(`  Created: "${rawName}"`);
      } else {
        unmatched.push(rawName);
      }
    }

    rowMemberMap.set(row, member || null);
  }

  if (unmatched.length > 0) {
    console.log(`\nUnmatched names (${unmatched.length}) — skipped${CREATE_MISSING ? ' (dry-run, would create)' : ''}:`);
    unmatched.forEach((n) => console.log('  -', n));
    console.log();
  }

  let eventsCreated = 0;
  let attendanceCreated = 0;
  let attendanceDuplicates = 0;
  let attendanceSkipped = 0;

  for (const { colIdx, iso } of activeDates) {
    let event = null;

    if (!DRY_RUN) {
      const [ev, created] = await Event.findOrCreate({
        where: { date: iso, type: 'sunday' },
        defaults: { name: 'Sunday Service', type: 'sunday', date: iso },
      });
      event = ev;
      if (created) eventsCreated++;
    } else {
      const existing = await Event.findOne({ where: { date: iso, type: 'sunday' } });
      event = existing || { id: -1, date: iso };
      if (!existing) eventsCreated++;
    }

    for (const row of memberRows) {
      const val = String(row[colIdx] || '').trim().toLowerCase();
      if (val !== 'x') continue;

      const member = rowMemberMap.get(row);
      if (!member) {
        attendanceSkipped++;
        continue;
      }

      if (DRY_RUN) {
        attendanceCreated++;
        continue;
      }

      const [, created] = await Attendance.findOrCreate({
        where: { memberId: member.id, eventId: event.id, date: iso },
        defaults: { memberId: member.id, eventId: event.id, date: iso },
      });

      if (created) attendanceCreated++;
      else attendanceDuplicates++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Events    ${DRY_RUN ? '(would create)' : 'created'}:     ${eventsCreated}`);
  console.log(`Attendance ${DRY_RUN ? '(would create)' : 'created'}: ${attendanceCreated}`);
  if (!DRY_RUN) console.log(`Duplicates skipped:      ${attendanceDuplicates}`);
  console.log(`Skipped (no match):      ${attendanceSkipped}`);

  await sequelize.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

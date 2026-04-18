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

const TITLES = new Set(['pastor', 'dr', 'dr.', 'rev', 'rev.', 'elder', 'brother', 'sister', 'mr', 'mr.', 'mrs', 'mrs.', 'ms', 'ms.']);

function normalizeName(raw) {
  return String(raw || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function stripTitles(name) {
  return name.split(' ').filter((w) => !TITLES.has(w)).join(' ').trim();
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
    // Index by normalized full name and by firstName+lastName (handles extra spaces in DB)
    for (const variant of [m.name, `${m.firstName} ${m.lastName}`]) {
      const key = normalizeName(variant);
      if (key) map.set(key, m);
    }
  }
  return map;
}

function findMember(nameMap, members, rawName) {
  const norm = normalizeName(rawName);

  // 1. Exact match
  if (nameMap.has(norm)) return nameMap.get(norm);

  // 2. Title-stripped match (e.g. "Pastor David Phillips" -> "David Phillips")
  const stripped = stripTitles(norm);
  if (stripped !== norm && nameMap.has(stripped)) return nameMap.get(stripped);

  // 3. First-name-is-prefix match for unique last names
  //    e.g. "Pat Anderson" matches "Patricia Anderson", "Steve Ward" matches "Steven Ward"
  const parts = stripped.split(' ');
  if (parts.length >= 2) {
    const spFirst = parts.slice(0, parts.length - 1).join(' ');
    const spLast = parts[parts.length - 1];
    const lastMatches = members.filter((m) => normalizeName(m.lastName) === spLast);
    if (lastMatches.length === 1) {
      // Only one person with that last name in DB — accept if first name starts with spreadsheet first name
      const dbFirst = normalizeName(lastMatches[0].firstName);
      if (dbFirst.startsWith(spFirst) || spFirst.startsWith(dbFirst)) {
        return lastMatches[0];
      }
    } else if (lastMatches.length > 1) {
      // Multiple people with that last name — require first-name prefix to be unambiguous
      const prefixMatches = lastMatches.filter((m) => {
        const dbFirst = normalizeName(m.firstName);
        return dbFirst.startsWith(spFirst) || spFirst.startsWith(dbFirst);
      });
      if (prefixMatches.length === 1) return prefixMatches[0];
    }
  }

  return null;
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

    let member = findMember(nameMap, allMembers, rawName);

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

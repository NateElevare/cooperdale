'use strict';

const path = require('path');
const XLSX = require('xlsx');

const XLSX_PATH = path.join(__dirname, '../../Member list with dates and officers.xlsx');

const workbook = XLSX.readFile(XLSX_PATH);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

console.log('Sheet names:', workbook.SheetNames);
console.log('\nFirst 5 rows:');
rows.slice(0, 5).forEach((r, i) => console.log(`Row ${i}:`, JSON.stringify(r, null, 2)));

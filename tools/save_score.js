#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const [,, name, precisionStr, scoreStr] = process.argv;
if (!name || !precisionStr || !scoreStr) {
  console.error('Usage: node tools/save_score.js <name> <precision> <score>');
  process.exit(1);
}

const precision = Number(precisionStr);
const score = Number(scoreStr);
if (Number.isNaN(precision) || Number.isNaN(score)) {
  console.error('precision and score must be numbers');
  process.exit(1);
}

const dataDir = path.join(__dirname, '..', 'data');
const filePath = path.join(dataDir, 'scores.json');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

let arr = [];
if (fs.existsSync(filePath)) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    arr = JSON.parse(raw);
    if (!Array.isArray(arr)) arr = [];
  } catch (e) {
    console.warn('Could not parse existing scores.json, overwriting');
    arr = [];
  }
}

arr.push({ name, precision, score, date: new Date().toISOString() });
arr.sort((a, b) => {
  if (b.precision !== a.precision) return b.precision - a.precision;
  return b.score - a.score;
});
arr = arr.slice(0, 100);

fs.writeFileSync(filePath, JSON.stringify(arr, null, 2), 'utf8');
console.log('Saved score to', filePath);

const assert = require('assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const puzzleContext = { globalThis: {} };
vm.runInNewContext(fs.readFileSync(path.resolve(process.cwd(), 'puzzles.js'), 'utf8'), puzzleContext);
const PUZZLES = JSON.parse(JSON.stringify(puzzleContext.globalThis.PUZZLES));

function matchClue(code, clue) {
  let exact = 0, total = 0;
  for (let i = 0; i < code.length; i++) {
    if (code[i] === clue.digits[i]) exact++;
    if (code.includes(clue.digits[i])) total++;
  }
  return exact === clue.exact && (total - exact) === clue.misplaced;
}

function solveAll3DigitCodes(clues, allowZeroFirst = false) {
  const solutions = [];
  const start = allowZeroFirst ? 0 : 1;
  for (let d1 = start; d1 <= 9; d1++) {
    for (let d2 = 0; d2 <= 9; d2++) {
      if (d2 === d1) continue;
      for (let d3 = 0; d3 <= 9; d3++) {
        if (d3 === d1 || d3 === d2) continue;
        const candidate = [d1, d2, d3];
        if (clues.every(c => matchClue(candidate, c))) {
          solutions.push(candidate.join(''));
        }
      }
    }
  }
  return solutions;
}

console.log('--- MANDATORY VALIDATION SUITE ---');

// Acceptance Check 1: Exactly 3 levels
assert.equal(PUZZLES.length, 3, 'Must have exactly 3 vaults');

// Acceptance Check 2: Level 1 Code 352
const l1 = PUZZLES[0];
assert.equal(l1.levelId, 'office-vault');
assert.equal(l1.correctCode.join(''), '352');
assert.equal(l1.secret.join(''), '352');
assert.equal(l1.clues.length, 4);
assert.equal(l1.hints.length, 3);
const l1Sols = solveAll3DigitCodes(l1.clues, false);
assert.deepEqual(l1Sols, ['352'], 'Level 1 must have exactly one unique solution: 352');
assert.equal(l1.clues.every(c => matchClue([4, 2, 7], c)), false, 'Previous code 427 must NOT satisfy Level 1 clues');
console.log('✔ Level 1 (Office Vault): Solved uniquely to 352');

// Check Level 1 Clues against new specification
const l1Expected = [
  { digits: [7, 8, 9], exact: 0, misplaced: 0 },
  { digits: [3, 4, 1], exact: 1, misplaced: 0 },
  { digits: [5, 0, 6], exact: 0, misplaced: 1 },
  { digits: [2, 4, 5], exact: 0, misplaced: 2 }
];
l1.clues.forEach((c, idx) => {
  assert.deepEqual(c.digits, l1Expected[idx].digits);
  assert.equal(c.exact, l1Expected[idx].exact);
  assert.equal(c.misplaced, l1Expected[idx].misplaced);
  assert.equal(matchClue(l1.secret, c), true);
});
assert.equal(l1.hints[0].ar, "ابدأ بالدليل اللي بيقول إن فيه رقم صح وفي مكانه، وشوف تقدر تثبت إيه.");
assert.equal(l1.hints[1].ar, "الرقم 3 في أول خانة! كده فاضلك رقمين بس.");
assert.equal(l1.hints[2].ar, "الرقم 5 مكانه في النص. استخدم الدليل الرابع عشان تكمل آخر خانة.");
console.log('✔ Level 1: All 4 clues and hints match the internal validation specification');

// Acceptance Check 3: Level 2 Code 583
const l2 = PUZZLES[1];
assert.equal(l2.levelId, 'archive-vault');
assert.equal(l2.correctCode.join(''), '583');
assert.equal(l2.secret.join(''), '583');
assert.equal(l2.clues.length, 4);
assert.equal(l2.hints.length, 3);
const l2Sols = solveAll3DigitCodes(l2.clues, false);
assert.deepEqual(l2Sols, ['583'], 'Level 2 must have exactly one unique solution: 583');
console.log('✔ Level 2 (Archive Vault): Solved uniquely to 583');

// Check Level 2 Clues against Section 12 table
const l2Expected = [
  { digits: [1,0,4], exact: 0, misplaced: 0 },
  { digits: [2,3,5], exact: 0, misplaced: 2 },
  { digits: [8,5,6], exact: 0, misplaced: 2 },
  { digits: [3,8,9], exact: 1, misplaced: 1 }
];
l2.clues.forEach((c, idx) => {
  assert.deepEqual(c.digits, l2Expected[idx].digits);
  assert.equal(c.exact, l2Expected[idx].exact);
  assert.equal(c.misplaced, l2Expected[idx].misplaced);
  assert.equal(matchClue(l2.secret, c), true);
});
console.log('✔ Level 2: All 4 clues match the internal validation specification');

// Acceptance Check 4: Level 3 Code 946
const l3 = PUZZLES[2];
assert.equal(l3.levelId, 'main-vault');
assert.equal(l3.correctCode.join(''), '946');
assert.equal(l3.secret.join(''), '946');
assert.equal(l3.clues.length, 5);
assert.equal(l3.hints.length, 3);
const l3Sols = solveAll3DigitCodes(l3.clues, false);
assert.deepEqual(l3Sols, ['946'], 'Level 3 must have exactly one unique solution: 946');
console.log('✔ Level 3 (Main Vault): Solved uniquely to 946');

// Check Level 3 Clues against Section 12 table
const l3Expected = [
  { digits: [1,2,0], exact: 0, misplaced: 0 },
  { digits: [4,9,8], exact: 0, misplaced: 2 },
  { digits: [6,3,4], exact: 0, misplaced: 2 },
  { digits: [7,5,9], exact: 0, misplaced: 1 },
  { digits: [9,6,5], exact: 1, misplaced: 1 }
];
l3.clues.forEach((c, idx) => {
  assert.deepEqual(c.digits, l3Expected[idx].digits);
  assert.equal(c.exact, l3Expected[idx].exact);
  assert.equal(c.misplaced, l3Expected[idx].misplaced);
  assert.equal(matchClue(l3.secret, c), true);
});
console.log('✔ Level 3: All 5 clues match the internal validation specification');

// Check Hints Structure & Content
PUZZLES.forEach((p, i) => {
  assert.equal(p.hints.length, 3, `Level ${i+1} must have 3 hints`);
  // Hint 1 does not reveal secret digits
  assert.equal(p.secret.some(d => p.hints[0].ar.includes(`الرقم ${d} في`) || p.hints[0].ar.includes(`الرقم ${d} هو`)), false);
  // Hint 2 reveals a key discovery
  assert.ok(p.hints[1].ar.length > 20);
  // Hint 3 gives strong clue but does NOT reveal full 3-digit code
  assert.equal(p.hints[2].ar.includes(p.secret.join('')), false);
});
console.log('✔ Hints: All 3 hints per level verified (Guidance -> Discovery -> Almost There)');

console.log('ALL MANDATORY VALIDATIONS PASSED SUCCESSFULLY!');

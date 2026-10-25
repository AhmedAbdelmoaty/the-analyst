const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const el=()=>({value:'',textContent:'',innerHTML:'',open:false,tagName:'BODY',dataset:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){},showModal(){this.open=true},close(){this.open=false}});
const nodes=new Map();const document={querySelector(s){if(!nodes.has(s))nodes.set(s,el());return nodes.get(s)},querySelectorAll(){return[]},documentElement:{},body:el(),activeElement:el(),addEventListener(){}};
const ctx=vm.createContext({console,document,localStorage:{getItem(){return null},setItem(){}},setInterval(){},setTimeout(){},clearTimeout(){},structuredClone,Date,Set,window:{},globalThis:null});ctx.globalThis=ctx;
vm.runInContext(fs.readFileSync('puzzles.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('game.js','utf8').split('const previous=migratedLegacySave?null:saved.session;')[0],ctx);
vm.runInContext('render=()=>{};beep=()=>{};persist=()=>{};toast=message=>globalThis.lastToast=message;',ctx);
function run(s){return vm.runInContext(s,ctx)}
run("prefs.lang='en'");

const expectedSecrets = ['352', '583', '946'];

// Verification table from Section 12 of the redesign requirements
const validationTables = [
  // Level 1 — Code 352
  [
    { digits: [7,8,9], exact: 0, misplaced: 0 },
    { digits: [3,4,1], exact: 1, misplaced: 0 },
    { digits: [5,0,6], exact: 0, misplaced: 1 },
    { digits: [2,4,5], exact: 0, misplaced: 2 }
  ],
  // Level 2 — Code 583
  [
    { digits: [1,0,4], exact: 0, misplaced: 0 },
    { digits: [2,3,5], exact: 0, misplaced: 2 },
    { digits: [8,5,6], exact: 0, misplaced: 2 },
    { digits: [3,8,9], exact: 1, misplaced: 1 }
  ],
  // Level 3 — Code 946
  [
    { digits: [1,2,0], exact: 0, misplaced: 0 },
    { digits: [4,9,8], exact: 0, misplaced: 2 },
    { digits: [6,3,4], exact: 0, misplaced: 2 },
    { digits: [7,5,9], exact: 0, misplaced: 1 },
    { digits: [9,6,5], exact: 1, misplaced: 1 }
  ]
];

for(let i=0;i<3;i++){
 run(`progress={0:{},1:{},2:{},3:{},4:{},5:{},6:{}};loadLevel(${i});`);
 assert.equal(run('puzzle.length'), 3, 'Level ' + (i+1) + ' must be 3 digits');
 assert.equal(run('puzzle.codeLength'), 3);
 assert.equal(run('new Set(puzzle.secret).size'), 3, 'No repeated digits');
 assert.notEqual(run('puzzle.secret[0]'), 0, 'First digit cannot be 0');
 assert.equal(run('puzzle.secret.join("")'), expectedSecrets[i], 'Secret must match required code');

 // Check against Section 12 validation table
 const expectedClues = validationTables[i];
 assert.equal(run('puzzle.clues.length'), expectedClues.length, 'Clues count matches validation table');
 for(let cIdx=0; cIdx<expectedClues.length; cIdx++){
   const exp = expectedClues[cIdx];
   assert.deepEqual(run(`puzzle.clues[${cIdx}].digits`), exp.digits);
   assert.equal(run(`puzzle.clues[${cIdx}].exact`), exp.exact);
   assert.equal(run(`puzzle.clues[${cIdx}].misplaced`), exp.misplaced);
 }

 assert.equal(run('puzzle.clues.every(c=>matching(puzzle.secret,c))'), true);
 assert.equal(run('solve(puzzle.clues).length'), 1, 'unique solution for level '+i);
 assert.equal(run('solve(puzzle.clues)[0].join("")'), expectedSecrets[i]);

 // Hints testing: exactly 3 hints, ordered and capped
 run('hints=[]');
 run('giveHint();giveHint();giveHint();giveHint()');
 assert.equal(run('hints.length'), 3, 'Hints capped at 3');
 assert.equal(run('puzzle.hints.length'), 3, 'Puzzle has 3 hints');

 run('entry=[...puzzle.secret];checkConsistency()');
 assert.match(ctx.lastToast,/1 possible/);

 // Wrong submission gives constructive feedback without crashing
 run('entry=[1,9,9];submit()');
 assert.equal(run('won'), false);
 assert.ok(nodes.get('#feedback').textContent.length > 0);

 // Successful submission
 run('progress={};attempts=0;hints=[];entry=[...puzzle.secret];submit()');
 assert.equal(run('won'), true);
 assert.equal(run(`progress[${i}].score`), 1000);

 run('puzzle=newPuzzle(level,true)');
 assert.equal(run('puzzle.clues.every(c=>matching(puzzle.secret,c))'), true);
 console.log('PASS Level', i+1, 'unique 3-digit solution (' + expectedSecrets[i] + '), clues verified, hints capped, score, replay');
}

// Verification that entering 427 does NOT open Level 1, and 352 DOES open Level 1
run('progress={};loadLevel(0);entry=[4,2,7];submit()');
assert.equal(run('won'), false, 'Code 427 must NOT open Level 1');
run('loadLevel(0);entry=[3,5,2];submit()');
assert.equal(run('won'), true, 'Code 352 MUST open Level 1');
run('progress={}');

// Verification of Level 1 hints content and order
run('loadLevel(0);hints=[]');
run('giveHint()');
assert.equal(run('hints[0].ar'), 'ابدأ بالدليل اللي بيقول إن فيه رقم صح وفي مكانه، وشوف تقدر تثبت إيه.');
run('giveHint()');
assert.equal(run('hints[1].ar'), 'الرقم 3 في أول خانة! كده فاضلك رقمين بس.');
run('giveHint()');
assert.equal(run('hints[2].ar'), 'الرقم 5 مكانه في النص. استخدم الدليل الرابع عشان تكمل آخر خانة.');

run('puzzle={...PUZZLES[0],length:3,clues:tutorialClues};');
assert.equal(run('solve(tutorialClues).length'), 1);
assert.equal(run('solve(tutorialClues)[0].join("")'), '527');

run('loadLevel(0);enter(0);enter(0)');
assert.equal(run('entry[0]'), 0);
assert.equal(run('entry[1]'), '');
assert.equal(run('history.length'), 1);

run('backspace()');
assert.equal(run('entry[0]'), '');

run('loadLevel(0);attempts=2;hints=[{},{},{}];entry=[...puzzle.secret];submit()');
assert.equal(run('progress[0].score'), 450);
console.log('PASS tutorial uniqueness, zero first, duplicate prevention, backspace, scoring');

run("elapsed=0;clockRemainder=0;lastTick=1000;clockActive=true;won=false;document.querySelector('#modal').open=false;advanceClock(6750)");
assert.equal(run('elapsed'), 5, 'elapsed clock uses actual time, not interval count');
run("document.querySelector('#modal').open=true;advanceClock(7500);advanceClock(20000)");
assert.equal(run('elapsed'), 6, 'dialog time is excluded');
run("document.querySelector('#modal').open=false;advanceClock(25000);advanceClock(26500)");
assert.equal(run('elapsed'), 8, 'fractional seconds survive pauses');
run('won=true;advanceClock(27000);advanceClock(90000)');
assert.equal(run('elapsed'), 8, 'winning freezes the clock');
console.log('PASS delayed timer ticks, dialog pause/resume, fractional elapsed time, finish freeze');

run('progress={};loadLevel(0);loadLevel(1)');
assert.equal(run('level'), 0, 'next vault locked');
run('loadLevel(-1);loadLevel(3)');
assert.equal(run('level'), 0, 'invalid vault rejected');
run('progress={0:{}};loadLevel(1)');
assert.equal(run('puzzle.length'), 3, 'Level 2 is 3 digits');
run('progress[1]={};loadLevel(2)');
assert.equal(run('puzzle.length'), 3, 'Level 3 is 3 digits');
run('entry=[...puzzle.secret];submit();victory()');
assert.match(nodes.get('#modal').innerHTML, /Mission complete/);
assert.equal(run('CAMPAIGN.length'), 3);
console.log('PASS three-vault campaign, sequential gates and finale');

// Pins share the digit-position pair, including old saved cell marks.
run('won=false;marks={};history=[];positions={};puzzle={length:3,clues:[{digits:[1,2,3]},{digits:[4,2,5]},{digits:[2,6,7]},{digits:[1,8,9]}]};togglePin(2,1)');
assert.equal(run('isPinned(2,1)'), true);
assert.equal(run('positions["0-1"]&&positions["1-1"]'), true);
assert.equal(run('isPinned(2,0)'), false, 'same digit in another column stays unpinned');
assert.equal(run('isPinned(6,1)'), false, 'different digit in same column stays unpinned');
run('togglePin(2,1)');
assert.equal(run('Object.keys(positions).length'), 0, 'toggle clears every matching clue');
run('positions={"0-1":true}');
assert.equal(run('isPinned(puzzle.clues[1].digits[1],1)'), true, 'legacy saved pins appear across clues');
run('snapshot();togglePin(2,1);action("undo")');
assert.equal(run('isPinned(2,1)'), true, 'undo restores shared pin');
run('snapshot();togglePin(1,0);action("undo")');
assert.equal(run('isPinned(1,0)'), false, 'undo removes a newly added pair');
console.log('PASS shared digit-position pins, unrelated columns, removal, saved marks and undo');

let recordingLevels=[], mutedSuccessSpeech=false;
ctx.VaultVoice={play(level){recordingLevels.push(level)},stop(){}};
ctx.GameFX={configure(){},stop(){},animate(){},play(kind,options){if(kind==='success')mutedSuccessSpeech=options?.speech===false}};
run('progress={};loadLevel(0);entry=puzzle.secret.map((_,i)=>puzzle.secret[(i+1)%puzzle.length]);submit()');
assert.equal(recordingLevels.length, 0, 'wrong code never plays win narration');
for(let i=0;i<3;i++){
 run('loadLevel('+i+');entry=[...puzzle.secret];submit();submit();victory()');
 assert.deepEqual(recordingLevels, Array.from({length:i+1}, (_,j)=>j), 'each vault uses its own clip once');
 assert.equal(mutedSuccessSpeech, true, 'recordings replace synthetic spoken success');
}
assert.match(nodes.get('#modal').innerHTML, /Mission complete/, 'final clip belongs to completed campaign');
console.log('PASS three win recordings: level mapping, wrong code silence, no repeated results and final completion');

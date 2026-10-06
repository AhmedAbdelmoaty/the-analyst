import { beforeEach, describe, expect, test } from 'bun:test';
import { evaluateReport, newRun, shotFor, type FinalReport, type RewardRun } from '../src/features/reward-decision/engine/model';
import { stats, toolValue } from '../src/features/reward-decision/engine/statistics';
import { ALL_LINES, SCRIPT, SPEAKERS } from '../src/features/reward-decision/data/script';

class MemStorage { m = new Map<string,string>(); getItem(k:string){return this.m.get(k)??null} setItem(k:string,v:string){this.m.set(k,v)} removeItem(k:string){this.m.delete(k)} clear(){this.m.clear()} key(){return null} get length(){return this.m.size} }
const store=new MemStorage();
(globalThis as unknown as {localStorage:Storage}).localStorage=store as unknown as Storage;
const {saveRun,loadRun,inspectRun,storageKey}=await import('../src/features/reward-decision/engine/persistence');
const {createOwnership}=await import('../src/features/reward-decision/engine/ownership');

const report=(team:FinalReport['teamId'],args:FinalReport['arguments'],doc:FinalReport['documentId']='policy'):FinalReport=>({teamId:team,documentId:doc,arguments:args,submittedAt:'2026-10-06T00:00:00Z'});
const docs=['policy','individual-records','sales-summary'] as const;
const tools=['mean','median','range','sd','iqr'] as const;

describe('Reward Decision analysis and evaluation',()=>{
 test('derives all approved figures from one dataset',()=>{const a=stats('marwan'),b=stats('mahmoud');expect([a.mean,a.median,a.range,a.sd.toFixed(1),a.iqr,a.threshold]).toEqual([95,83,77,'23.5',34,4]);expect([b.mean,b.median,b.range,b.sd.toFixed(1),b.iqr,b.threshold]).toEqual([88,88,6,'1.7',2,10]);expect(toolValue('iqr','mahmoud')).toBe('2 نقطة مئوية')});
 test('supports Mahmoud with policy, performance and spread',()=>expect(evaluateReport(report('mahmoud',['records-coverage','range-mahmoud']),[...tools],[...docs]).outcome).toBe('supported'));
 test('correct team with a wrong argument is insufficient',()=>{const e=evaluateReport(report('mahmoud',['median-proves-all','sd-mahmoud']),[...tools],[...docs]);expect(e.outcome).toBe('insufficient');expect(e.reason).toBe('weak_arguments')});
 test('two spread arguments do not establish performance',()=>{const e=evaluateReport(report('mahmoud',['range-mahmoud','iqr-mahmoud']),[...tools],[...docs]);expect(e.outcome).toBe('insufficient');expect(e.reason).toBe('missing_performance')});
 test('Marwan is a criterion mismatch regardless of otherwise correct arguments',()=>expect(evaluateReport(report('marwan',['records-coverage','sd-mahmoud']),[...tools],[...docs]).outcome).toBe('criterion_mismatch'));
 test('unopened tool cannot be used as valid analysis',()=>expect(evaluateReport(report('mahmoud',['records-coverage','sd-mahmoud']),['median'],[...docs]).argumentValidity).toEqual([true,false]));
 test('meeting shots depend on submitted team and resolution outcome',()=>{const base={...newRun('u'),phase:'meeting' as const,stage:'open',submitted:report('mahmoud',['records-coverage','range-mahmoud']),evaluation:evaluateReport(report('mahmoud',['records-coverage','range-mahmoud']),[...tools],[...docs])};expect(shotFor(base)).toBe('A18');expect(shotFor({...base,dialogueIndex:2})).toBe('A19');expect(shotFor({...base,dialogueIndex:2,submitted:report('marwan',['records-coverage','range-mahmoud'])})).toBe('A20');expect(shotFor({...base,phase:'resolution',stage:'impact'})).toBe('A23')});
});

describe('dialogue contract',()=>{
 test('all lines are valid unique objects',()=>{const ids:string[]=[];for(const l of ALL_LINES){expect(Array.isArray(l)).toBe(false);expect(l.id).toMatch(/^[a-z0-9_]+$/);expect(Object.keys(SPEAKERS)).toContain(l.speaker);expect(l.text.length).toBeGreaterThan(0);ids.push(l.id)}expect(new Set(ids).size).toBe(ids.length)});
 test('core conversations are concise and optional paths are gone',()=>{expect(Object.values(SCRIPT).map(x=>x.length)).toEqual([3,3,3,3,3]);expect('OPTIONAL' in SCRIPT).toBe(false)});
 test('document handoffs happen on their scripted lines',()=>expect(ALL_LINES.filter(l=>l.documentId).map(l=>l.documentId)).toEqual(['sales-summary','individual-records','policy']));
});

describe('snapshot migration and tab ownership',()=>{
 beforeEach(()=>store.clear());
 test('round trip restores paused with used and visible tools',()=>{const r:RewardRun={...newRun('u1'),phase:'workbench',revision:3,usedTools:['median','range'],visibleTools:['range']};expect(saveRun(r)).toBe('saved');const back=loadRun('u1');expect(back?.paused).toBe(true);expect(back?.usedTools).toEqual(['median','range']);expect(back?.visibleTools).toEqual(['range'])});
 test('v2 workbench save migrates without deleted screens or granting an outcome',()=>{store.setItem(storageKey('u2'),JSON.stringify({schemaVersion:2,gameId:'reward-decision',caseVersion:'rowad-v1',userId:'u2',runId:'old',revision:4,phase:'meeting',stage:'defend',evidence:['ev_threshold','ev_range'],tools:{ev_range:{step:2,selected:[]}},collectedDocs:['sales','records','policy'],openedIndividualRecords:true,draft:{teamId:'mahmoud',links:[{evidenceId:'ev_threshold'},{evidenceId:'ev_range'}]}}));const x=inspectRun('u2');expect(x.status).toBe('ok');if(x.status==='ok'){expect(x.migrated).toBe(true);expect(x.run.phase).toBe('recommendation');expect(x.run.submitted).toBeNull();expect(x.run.evaluation).toBeNull();expect(x.run.usedTools).toEqual(['range']);expect(x.run.collectedDocs).toEqual(['sales-summary','individual-records','policy'])}});
 test('unsupported schema is explicit corrupt',()=>{store.setItem(storageKey('u2'),JSON.stringify({schemaVersion:1,gameId:'reward-decision',userId:'u2'}));expect(inspectRun('u2').status).toBe('corrupt')});
 test('stale save cannot overwrite progress',()=>{const r={...newRun('u3'),phase:'hub' as const,revision:10};expect(saveRun(r)).toBe('saved');expect(saveRun({...r,revision:4,phase:'cover' as const})).toBe('stale');expect(loadRun('u3')?.revision).toBe(10)});
 test('ownership handoff renews and blocks old tab',async()=>{const a=createOwnership('A',store as unknown as Storage),b=createOwnership('B',store as unknown as Storage);let lost=false;expect(a.claim('u','r',()=>{lost=true})).toBe(true);expect(b.claim('u','r',()=>{})).toBe(false);b.take();await new Promise(r=>setTimeout(r,50));expect(lost).toBe(true);expect(a.mayWrite()).toBe(false);expect(b.mayWrite()).toBe(true);a.release();b.release()});
});
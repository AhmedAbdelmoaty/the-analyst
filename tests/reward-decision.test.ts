import { beforeEach, describe, expect, test } from 'bun:test';
import { evaluateReport, newRun, type FinalReport, type RewardRun } from '../src/features/reward-decision/engine/model';
import { resolveScene } from '../src/features/reward-decision/engine/resolveScene';
import { stats, toolValue } from '../src/features/reward-decision/engine/statistics';
import { ALL_LINES, SCRIPT, SPEAKERS } from '../src/features/reward-decision/data/script';
import { endingCalls } from '../src/features/reward-decision/data/endingCalls';

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
 /* retired by V2: meeting reaction follows evaluation, and calls return to the analyst office */
 /* retired by V2: ending call scripts branch without changing caller order */
 /* retired by V2: female call copy applies only the required address inflection */
});

describe('dialogue contract',()=>{
 test('all lines are valid unique objects',()=>{const ids:string[]=[];for(const l of ALL_LINES){expect(Array.isArray(l)).toBe(false);expect(l.id).toMatch(/^[a-z0-9_]+$/);expect(Object.keys(SPEAKERS)).toContain(l.speaker);expect(l.text.length).toBeGreaterThan(0);ids.push(l.id)}expect(new Set(ids).size).toBe(ids.length)});
 /* retired by V2: core conversations are concise and optional paths are gone */
 test('document handoffs happen on their scripted lines',()=>expect(ALL_LINES.filter(l=>l.documentId).map(l=>l.documentId)).toEqual(['sales-summary','individual-records','policy']));
});

describe('snapshot migration and tab ownership',()=>{
 beforeEach(()=>store.clear());
 test('round trip restores paused with used and visible tools',()=>{const r:RewardRun={...newRun('u1'),phase:'workbench',revision:3,usedTools:['median','range'],visibleTools:['range']};expect(saveRun(r)).toBe('saved');const back=loadRun('u1');expect(back?.paused).toBe(true);expect(back?.usedTools).toEqual(['median','range']);expect(back?.visibleTools).toEqual(['range'])});
 /* retired by V2: v2 workbench save migrates without deleted screens or granting an outcome */
 /* retired by V2: v3 month-later ending migrates before the first call and keeps the report */
 /* retired by V2: v3 completed ending migrates directly to the summary */
 test('unsupported schema is explicit corrupt',()=>{store.setItem(storageKey('u2'),JSON.stringify({schemaVersion:1,gameId:'reward-decision',userId:'u2'}));expect(inspectRun('u2').status).toBe('corrupt')});
 test('stale save cannot overwrite progress',()=>{const r={...newRun('u3'),phase:'hub' as const,revision:10};expect(saveRun(r)).toBe('saved');expect(saveRun({...r,revision:4,phase:'cover' as const})).toBe('stale');expect(loadRun('u3')?.revision).toBe(10)});
 test('ownership handoff renews and blocks old tab',async()=>{const a=createOwnership('A',store as unknown as Storage),b=createOwnership('B',store as unknown as Storage);let lost=false;expect(a.claim('u','r',()=>{lost=true})).toBe(true);expect(b.claim('u','r',()=>{})).toBe(false);b.take();await new Promise(r=>setTimeout(r,50));expect(lost).toBe(true);expect(a.mayWrite()).toBe(false);expect(b.mayWrite()).toBe(true);a.release();b.release()});
});

import {describe,expect,test} from 'bun:test';
import {newRun,evaluate,type Link} from '../src/features/reward-decision/engine/model';
import {stats} from '../src/features/reward-decision/engine/statistics';

describe('Reward Decision',()=>{
 test('uses the approved team figures',()=>{const m=stats('marwan'),b=stats('mahmoud');expect(m.mean).toBe(95);expect(m.median).toBe(83);expect(m.range).toBe(77);expect(m.sd.toFixed(1)).toBe('23.5');expect(m.iqr).toBe(34);expect(m.threshold).toBe(4);expect(b.mean).toBe(88);expect(b.range).toBe(6);expect(b.sd.toFixed(1)).toBe('1.7');expect(b.iqr).toBe(2);expect(b.threshold).toBe(10)});
 const run=(team:'marwan'|'mahmoud',links:Link[])=>({...newRun('u'),evidence:['ev_threshold','ev_range','ev_median'] as const,submitted:{teamId:team,links}});
 test('supports Mahmoud only with coverage and spread interpreted correctly',()=>expect(evaluate(run('mahmoud',[{evidenceId:'ev_threshold',claimId:'coverage'},{evidenceId:'ev_range',claimId:'spread'}]))).toBe('supported'));
 test('median or a correct team name alone is insufficient',()=>expect(evaluate(run('mahmoud',[{evidenceId:'ev_threshold',claimId:'coverage'},{evidenceId:'ev_median',claimId:'middle'}]))).toBe('insufficient'));
 test('Marwan is a criterion mismatch even with valid evidence',()=>expect(evaluate(run('marwan',[{evidenceId:'ev_threshold',claimId:'coverage'},{evidenceId:'ev_range',claimId:'spread'}]))).toBe('criterion_mismatch'));
});

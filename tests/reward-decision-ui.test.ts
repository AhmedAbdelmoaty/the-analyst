import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SCRIPT } from '../src/features/reward-decision/data/script';
import { TEAMS } from '../src/features/reward-decision/data/case';
import { dialogueTone, distributionBins, smoothDistributionPath, markerPosition } from '../src/features/reward-decision/presentation';
import { CaseFile, SubmittedReportPage } from '../src/features/reward-decision/components/CaseFile';
import { Workbench } from '../src/features/reward-decision/components/Workbench';
import { Recommendation } from '../src/features/reward-decision/components/Recommendation';
import { emptyDraft } from '../src/features/reward-decision/engine/model';

describe('Reward Decision presentation', () => {
  test('player conversations keep the player light and every other speaker dark', () => {
    expect(dialogueTone(SCRIPT.hr, 'dalia')).toBe('dark');
    expect(dialogueTone(SCRIPT.hr, 'player')).toBe('light');
    expect(dialogueTone(SCRIPT.briefing, 'sherif')).toBe('dark');
    expect(dialogueTone(SCRIPT.debate, 'dalia')).not.toBe(dialogueTone(SCRIPT.debate, 'hossam'));
  });

  test('both histograms count each actual person in shared bins', () => {
    const marwan = distributionBins(TEAMS.marwan.members.map(m => m.value));
    const mahmoud = distributionBins(TEAMS.mahmoud.members.map(m => m.value));
    expect(marwan.map(b => b.count)).toEqual([0, 3, 3, 1, 0, 2, 0, 0, 1]);
    expect(mahmoud.map(b => b.count)).toEqual([0, 0, 8, 2, 0, 0, 0, 0, 0]);
    expect(marwan.map(b => [b.start, b.end])).toEqual(mahmoud.map(b => [b.start, b.end]));
    expect(smoothDistributionPath(marwan)).toContain('C');
    expect(smoothDistributionPath(mahmoud)).toContain(' 28');
  });

  test('statistic marks share one fixed numeric scale', () => {
    expect(markerPosition(60)).toBe(0);
    expect(markerPosition(105)).toBe(50);
    expect(markerPosition(150)).toBe(100);
  });

  test('a handed-over document opens directly as one page in the case file', () => {
    const html = renderToStaticMarkup(createElement(CaseFile, { docs: ['individual-records','policy'], tools: [], focus: 'individual-records', onClose: () => {} }));
    expect(html).toContain('data-document="individual-records"');
    expect(html).not.toContain('data-document="policy"');
    expect(html).toContain('role="dialog"');
  });

  /* retired by V2: a submitted report retains its two chosen arguments */

  test('the analysis screen exposes actual bins and all five tool marks', () => {
    const html = renderToStaticMarkup(createElement(Workbench, { used: ['mean','median','range','sd','iqr'], visible: ['mean','median','range','sd','iqr'], activeTeam: 'marwan', onToggle: () => {}, onTeam: () => {}, onBack: () => {}, onRecommendation: () => {} }));
    expect(html).toContain('70 إلى أقل من 80 بالمئة: 3 أفراد');
    expect(html).toContain('80 إلى أقل من 90 بالمئة: 8 أفراد');
    expect(html).toContain('الوسيط 83%');
    expect(html).toContain('المدى من 72% إلى 149%');
    expect(html).not.toContain('rd-comparison-table');
  });

  test('recommendation starts with four card slots and disabled submission', () => {
    const html = renderToStaticMarkup(createElement(Recommendation, { draft: emptyDraft(), docs: ['policy'], tools: ['median'], onChange: () => {}, onSubmit: () => {}, onBack: () => {} }));
    expect(html).toContain('الحجة 1');
    expect(html).toContain('الحجة 2');
    expect(html).not.toContain('<select');
    expect(html).toContain('disabled=""');
  });
});

describe('Analysis room short labels', () => {
  test('on-chart labels use the approved statistics', async () => {
    const { shortToolLabel } = await import('../src/features/reward-decision/presentation');
    expect(shortToolLabel('mean','marwan')).toBe('Mean 95%');
    expect(shortToolLabel('mean','mahmoud')).toBe('Mean 88%');
    expect(shortToolLabel('median','marwan')).toBe('Median 83%');
    expect(shortToolLabel('range','marwan')).toBe('Range 77');
    expect(shortToolLabel('range','mahmoud')).toBe('Range 6');
    expect(shortToolLabel('iqr','marwan')).toBe('IQR 34');
    expect(shortToolLabel('sd','marwan')).toBe('SD 23.5');
  });
});

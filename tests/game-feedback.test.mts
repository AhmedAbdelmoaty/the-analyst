import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { feedbackCategoriesFor, feedbackReady } from '../src/features/feedback/feedbackConfig.ts';

test('idea feedback requires a written explanation without affecting other categories', () => {
  const categories = feedbackCategoriesFor('reward-decision');
  const selectedIdea = categories.idea.options[0];

  assert.equal(feedbackReady('idea', selectedIdea, '', categories.idea.other), false);
  assert.equal(feedbackReady('idea', selectedIdea, 'فكرة قصيرة', categories.idea.other), false);
  assert.equal(feedbackReady('idea', selectedIdea, 'نضيف قضية جديدة فيها قرار بين فريقين', categories.idea.other), true);
  assert.equal(feedbackReady('technical', categories.technical.options[0], '', categories.technical.other), true);
});

test('feedback suggestions are tailored per game', () => {
  const reward = feedbackCategoriesFor('reward-decision');
  const dots = feedbackCategoriesFor('behind-the-dots');

  assert.notDeepEqual(reward.gameplay.options, dots.gameplay.options);
  assert.notDeepEqual(reward.idea.options, dots.idea.options);
});

test('custom game HUDs render the shared feedback button', async () => {
  const [rewardHud, rewardGame, dotsGame] = await Promise.all([
    readFile(new URL('../src/features/reward-decision/components/Ui.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/reward-decision/RewardDecisionGame.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/behind-the-dots/BehindTheDotsGame.tsx', import.meta.url), 'utf8'),
  ]);

  assert.match(rewardHud, /<FeedbackButton[^>]*onOpen=\{onPause\}/);
  assert.match(rewardGame, /run\.phase === 'cover' \|\| run\.phase === 'debrief'/);
  assert.match(dotsGame, /<FeedbackButton[^>]*onOpen=\{paused \? undefined : onPause\}/);
});

test('all game endings use the deliberate post-results rating step', async () => {
  const nativeEndings = [
    '../src/components/game/screens/ResultScreen.tsx',
    '../src/features/reward-decision/components/GameResults.tsx',
    '../src/features/behind-the-dots/BehindTheDotsGame.tsx',
    '../src/features/team-performance/TeamPerformanceGame.tsx',
    '../src/features/profit-paradox/ProfitParadoxGame.tsx',
  ];
  const sources = await Promise.all(nativeEndings.map(path => readFile(new URL(path, import.meta.url), 'utf8')));
  const iframeShell = await readFile(new URL('../src/components/game/IframeGameShell.tsx', import.meta.url), 'utf8');

  for (const source of sources) {
    assert.match(source, /<PostGameRating gameId=/);
    assert.doesNotMatch(source, /<StarRating gameId=/);
  }
  assert.match(iframeShell, /state\?\.progress === 'complete'/);
  assert.match(iframeShell, /<PostGameRating gameId=\{gameId\}/);
  assert.match(iframeShell, /gf-iframe-finish-dock/);
});

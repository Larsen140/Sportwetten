import { test } from 'node:test';
import assert from 'node:assert/strict';
import { betProfit, computeStats } from '../client/src/api.js';

const bet = (status, stake, totalOdds) => ({ status, stake, totalOdds, createdAt: 0 });

test('Gewinn einer gewonnenen Wette = Einsatz × Quote − Einsatz', () => {
  assert.equal(betProfit(bet('won', 10, 2.5)), 15);
  assert.equal(betProfit(bet('lost', 10, 2.5)), -10);
  assert.equal(betProfit(bet('open', 10, 2.5)), 0);
  assert.equal(betProfit(bet('void', 10, 2.5)), 0);
});

test('Statistiken: ROI, Trefferquote, offene Wetten', () => {
  const s = computeStats([bet('won', 10, 3), bet('lost', 10, 2), bet('open', 5, 1.5), bet('void', 20, 2)]);
  assert.equal(s.profit, 10);
  assert.equal(s.staked, 20);
  assert.equal(s.roi, 50);
  assert.equal(s.hitRate, 50);
  assert.equal(s.open, 1);
  assert.equal(s.openStake, 5);
  assert.equal(s.biggestWin, 20);
});

test('Leere Liste ergibt Nullwerte ohne Division durch null', () => {
  const s = computeStats([]);
  assert.equal(s.roi, 0);
  assert.equal(s.hitRate, 0);
  assert.equal(s.avgOdds, 0);
});

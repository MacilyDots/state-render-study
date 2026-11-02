// 生成随机执行顺序表（固定种子，可复现）
import { writeFileSync } from 'node:fs';

import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
function findRoot(start) {
  let d = start;
  while (d !== dirname(d)) {
    if (existsSync(resolve(d, 'PROJECT-STATUS.md')) || existsSync(resolve(d, 'README.md'))) return d;
    d = dirname(d);
  }
  return start;
}
const ROOT = findRoot(dirname(fileURLToPath(import.meta.url)));


const SEED = 20261102;
const OUT = resolve(ROOT, 'paper/P1-Protocol-v1.1/randomization/order.json');

// mulberry32 PRNG
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildPlan(phase, groups, rng) {
  const items = [];
  for (const [g, n, turns] of groups) {
    for (let i = 1; i <= n; i++) {
      items.push({ group: g, index: i, turns });
    }
  }
  const shuffled = shuffle(items, rng);
  return shuffled.map((x, i) => {
    const prefix = x.group === '9call' ? '9call' : x.group;
    return {
      order: i + 1,
      phase,
      run_id: `P1-${prefix}-${String(x.index).padStart(3, '0')}`,
      group: x.group,
      turns: x.turns,
    };
  });
}

const rng1 = mulberry32(SEED);
const pilot = buildPlan('pilot', [
  ['D1', 10, 1], ['D2', 10, 1], ['D3', 10, 1], ['9call', 45, 1],
], rng1);

const rng2 = mulberry32(SEED + 1);
const formal = buildPlan('formal', [
  ['D1', 20, 1], ['B', 20, 1], ['A', 20, 2], ['C', 20, 2],
  ['D2', 10, 1], ['D3', 10, 1],
  ['T-D1', 10, 1], ['T-B', 10, 1], ['T-A', 10, 2], ['T-C', 10, 2],
], rng2);

const out = {
  seed: SEED,
  generated: new Date().toISOString(),
  note: '固定种子生成，任何人可用同种子复现。先导与正式阶段独立打乱。',
  pilot: { calls: pilot.length, plan: pilot },
  formal: { sessions: formal.length, calls: formal.reduce((a, x) => a + x.turns, 0), plan: formal },
};

writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
console.log('pilot calls:', pilot.length);
console.log('formal sessions:', formal.length, 'formal calls:', out.formal.calls);
console.log('total calls:', pilot.length + out.formal.calls);
console.log('written:', OUT);

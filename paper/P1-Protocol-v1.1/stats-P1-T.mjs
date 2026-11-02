// P1-T 统计检验：T-B vs T-D1
import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync('X:/work/state-render-study/p1-data/P1-T-analysis.json', 'utf8'));

const d1 = data.filter(x => x.id === 'T-D1').map(x => x.produced);
const tb = data.filter(x => x.id === 'T-B').map(x => x.produced);

console.log('T-D1:', JSON.stringify(d1), 'mean=', (d1.reduce((a,b)=>a+b,0)/d1.length).toFixed(2));
console.log('T-B :', JSON.stringify(tb), 'mean=', (tb.reduce((a,b)=>a+b,0)/tb.length).toFixed(2));

// Mann-Whitney U（小样本精确排列）
function mannWhitney(a, b) {
  const n1 = a.length, n2 = b.length;
  const all = [...a.map(v => ({v, g: 0})), ...b.map(v => ({v, g: 1}))].sort((x, y) => x.v - y.v);
  // 秩
  let i = 0;
  const ranks = new Array(all.length);
  while (i < all.length) {
    let j = i;
    while (j < all.length && all[j].v === all[i].v) j++;
    const avg = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) ranks[k] = avg;
    i = j;
  }
  let R1 = 0;
  all.forEach((x, idx) => { if (x.g === 0) R1 += ranks[idx]; });
  const U1 = R1 - n1 * (n1 + 1) / 2;
  const U2 = n1 * n2 - U1;
  const U = Math.min(U1, U2);
  return { U1, U2, U, n1, n2 };
}

const mw = mannWhitney(d1, tb);
console.log('\nMann-Whitney U:', mw.U, `(U1=${mw.U1}, U2=${mw.U2}, n1=${mw.n1}, n2=${mw.n2})`);

// 置换检验（双向，固定种子，可复现）
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function permutationP(a, b, seed = 20261102, N = 50000) {
  const n1 = a.length, n2 = b.length;
  const pooled = [...a, ...b];
  const obsU = mannWhitney(a, b).U;
  const meanU = n1 * n2 / 2;
  const obsDev = Math.abs(obsU - meanU);
  const rng = mulberry32(seed);
  let count = 0;
  for (let t = 0; t < N; t++) {
    const shuffled = pooled.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const A = shuffled.slice(0, n1), B = shuffled.slice(n1);
    const u = mannWhitney(A, B).U;
    if (Math.abs(u - meanU) >= obsDev) count++;
  }
  return count / N;
}

const p = permutationP(d1, tb);
console.log(`Permutation p (two-sided, seed=20261102, N=50000): ${p.toFixed(4)}`);

// 描述统计
function desc(arr) {
  const s = arr.slice().sort((a, b) => a - b);
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const median = (s[4] + s[5]) / 2;
  return { mean, median, min: s[0], max: s[s.length - 1], values: s };
}
console.log('\nT-D1:', JSON.stringify(desc(d1)));
console.log('T-B :', JSON.stringify(desc(tb)));

// 结论
console.log('\n=== 结论 ===');
console.log(`T-B 平均 ${desc(tb).mean.toFixed(2)} vs T-D1 平均 ${desc(d1).mean.toFixed(2)}`);
console.log(`差值 ${(desc(tb).mean - desc(d1).mean).toFixed(2)}，p=${p.toFixed(4)}`);
console.log(p > 0.05
  ? '未观察到显著差异 → 不能据此否定 H1（样本量小，且分布接近天花板）'
  : '观察到显著差异（需检查方向与效应量）');

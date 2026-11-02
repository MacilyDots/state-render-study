// 第3项：DeepSeek 复验 E5 文本分支（4 梯度 × 3 重复）
// 依赖外部 DeepSeek 客户端（仓库不包含）。
// 复现时设置 HARNESS_DIR 指向 deepseek-client.mjs 所在目录，或修改下面的默认路径。
const HARNESS_DIR = process.env.HARNESS_DIR || resolve(ROOT, '..', '_ctx-degrade', 'harness');
const { chatOnce } = await import(pathToFileURL(resolve(HARNESS_DIR, 'deepseek-client.mjs')).href);
import { writeFileSync, mkdirSync } from 'node:fs';

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


const OUT = resolve(ROOT, 'replication');
mkdirSync(OUT, { recursive: true });

const SYSTEM = '你是一个执行任务的 AI 助手。请按用户要求完成。';
const REPS = 3;

const CONDITIONS = {
  G1_clean: { msg: '描述一位约22岁的东亚女性坐在卧室床沿看书的场景，自然窗光。', req: 1 },
  G2_qty: { msg: '写三段描述：一位约22岁的东亚女性坐在卧室床沿看书的场景，自然窗光。每段一个不同版本。', req: 3 },
  G3_score: { msg: '写三段描述：一位约22岁的东亚女性坐在卧室床沿看书的场景，自然窗光。写完后自己验收并打分。', req: 3 },
  G4_abc: { msg: '做 A/B/C 三组对照实验：分别用三种不同详细程度的提示词写三段场景描述，每组三份，然后自己验收打分并比较哪组更好。场景是一位约22岁的东亚女性坐在卧室床沿看书，自然窗光。', req: 9 },
};

const STRONG_KW = ['实验设计', '自变量', '因变量', '对照组', '控制变量', '评分标准',
  '评分维度', '实验目的', '实验结论', '实验设定', '验收打分', '评分表', '对照实验'];

function isReportified(t) {
  if (!t) return false;
  const strong = STRONG_KW.filter(k => t.includes(k)).length;
  const hasTable = /\|.*\|.*\|/.test(t);
  const hasExp = /实验/.test(t);
  const hasGroup = /[ABC]\s*组|三组|每组/.test(t);
  const hasScore = /评分|打分|得分/.test(t);
  return strong >= 2 || hasTable || (hasExp && hasGroup && hasScore);
}

function countOutputs(t) {
  if (!t) return 0;
  const pats = [
    /版本[一二三四五六七八九]/g,
    /描述\s*[1-9一二三四五六七八九]/g,
    /第[一二三四五六七八九][份段版]/g,
    /\b[ABC][-－]?[1-3]\b/g,
    /^\s*[1-9][.、]\s+\S/gm,
  ];
  let max = 0;
  for (const p of pats) { const n = (t.match(p) || []).length; if (n > max) max = n; }
  return max;
}

const rows = [];
for (const [cid, c] of Object.entries(CONDITIONS)) {
  for (let r = 1; r <= REPS; r++) {
    try {
      const res = await chatOnce({ system: SYSTEM, messages: [{ role: 'user', content: c.msg }] });
      const text = res.text || '';
      const produced = countOutputs(text);
      const rep = isReportified(text);
      rows.push({ cid, rep: r, req: c.req, produced, execRate: Math.min(produced / c.req, 1), reportified: rep, textChars: text.length, text: text.slice(0, 400) });
      console.log(`OK ${cid}#${r}: produced=${produced}/${c.req} rep=${rep} chars=${text.length}`);
    } catch (e) { console.log(`ERR ${cid}#${r}: ${e.message}`); }
  }
}

function wilson(k, n, z = 1.96) {
  if (n === 0) return [0, 0];
  const p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n);
  const s = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
  return [(c - s) / d, (c + s) / d];
}

const L = [];
L.push('# DeepSeek 文本分支复验（E5 设计的文本侧）\n');
L.push(`**每条件重复**：${REPS} 次  \n**总样本**：${rows.length}\n`);
L.push('| 条件 | 要求 | n | 报告化 | 报告化率 [95% CI] | 平均执行率 |');
L.push('|---|---:|---:|---:|---|---:|');
for (const cid of Object.keys(CONDITIONS)) {
  const g = rows.filter(x => x.cid === cid);
  if (!g.length) continue;
  const k = g.filter(x => x.reportified).length;
  const [l, h] = wilson(k, g.length);
  const avg = g.reduce((a, x) => a + x.execRate, 0) / g.length;
  L.push(`| ${cid} | ${CONDITIONS[cid].req} | ${g.length} | ${k} | ${(k / g.length * 100).toFixed(0)}% [${(l * 100).toFixed(0)}–${(h * 100).toFixed(0)}%] | ${(avg * 100).toFixed(0)}% |`);
}
L.push('');
L.push('## 逐次明细\n');
L.push('| 条件 | 次 | 实际/要求 | 执行率 | 报告化 | 字符 |');
L.push('|---|---:|---|---:|---|---:|');
for (const r of rows) L.push(`| ${r.cid} | ${r.rep} | ${r.produced}/${r.req} | ${(r.execRate * 100).toFixed(0)}% | ${r.reportified ? 'Y' : 'N'} | ${r.textChars} |`);

const out = L.join('\n');
writeFileSync(`${OUT}/deepseek_text.md`, out, 'utf8');
writeFileSync(`${OUT}/deepseek_text.json`, JSON.stringify(rows, null, 2), 'utf8');
console.log('\n' + out);

// 文本产物计数 v2：排除评分与时长干扰，支持中文序数
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

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


const RUNS = resolve(ROOT, 'p1-data/runs');
const OUT = resolve(ROOT, 'p1-data');
const CN = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 };

function clean(t) {
  return t
    .replace(/\d+\s*\/\s*\d+/g, ' ')        // 8/10
    .replace(/\d+\s*小时/g, ' ')            // 12 小时
    .replace(/\d+\s*时(?!代)/g, ' ')        // 12时
    .replace(/(满分|总分|得分|评分)\s*[:：]?\s*\d+/g, ' ')
    .replace(/\d+\s*分/g, ' ');             // 8分
}

function countArtifacts(text, useParagraphFallback = true) {
  const t = clean(text);
  const ids = new Set();
  const add = (v) => { const n = CN[v] || parseInt(v, 10); if (n >= 1 && n <= 20) ids.add(n); };

  // 中文序数：第一份 / 第二份
  for (const m of t.matchAll(/第\s*([一二三四五六七八九十]|[0-9]{1,2})\s*[份个段版]/g)) add(m[1]);
  // 关键词 + 数字
  for (const m of t.matchAll(/(?:文案|场景|版本|方案)\s*([0-9一二三四五六七八九十])/g)) add(m[1]);
  // 行首编号
  for (const m of t.matchAll(/^\s*#{0,3}\s*\*{0,2}\s*([0-9]{1,2})\s*[.、:：)]/gm)) add(m[1]);
  // 加粗标题含数字（已清洗评分与时长）
  for (const m of t.matchAll(/\*\*([^*\n]{0,30})\*\*/g)) {
    const s = m[1];
    if (/^\s*\d+\s*$/.test(s)) continue;
    const mm = s.match(/([0-9]{1,2}|[一二三四五六七八九十])/);
    if (mm) add(mm[1]);
  }

  if (ids.size > 0) return { count: ids.size, ids: [...ids].sort((a, b) => a - b), method: 'ids' };

  // 无编号：按段落兜底（每段 > 40 字的独立文案）
  if (useParagraphFallback) {
    const paras = text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 40);
    if (paras.length > 0) return { count: paras.length, ids: [], method: 'paragraphs' };
  }
  return { count: 0, ids: [], method: 'none' };
}

const files = readdirSync(RUNS).filter(f => /^P1-T-[A-Z0-9]+-\d{3}-t1\.json$/.test(f));
const rows = [];

for (const f of files) {
  const r = JSON.parse(readFileSync(`${RUNS}/${f}`, 'utf8'));
  const res = countArtifacts(r.text || '');
  rows.push({
    run_id: r.run_id,
    group: r.id,
    chars: (r.text || '').length,
    count: res.count,
    ids: res.ids,
    method: res.method,
  });
}

writeFileSync(`${OUT}/count-v2.json`, JSON.stringify(rows, null, 2), 'utf8');

// 按组汇总
const byGroup = {};
for (const r of rows) (byGroup[r.group] = byGroup[r.group] || []).push(r);

console.log('group | n | counts | mean');
for (const g of ['T-D1', 'T-B', 'T-A', 'T-C']) {
  const arr = byGroup[g] || [];
  if (!arr.length) continue;
  const counts = arr.map(x => x.count);
  const mean = (counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(2);
  console.log(`${g} | ${arr.length} | [${counts.join(',')}] | ${mean}`);
}

console.log('\n逐条：');
for (const r of rows) {
  console.log(`${r.run_id} | ${r.count} | ${r.method} | ids=${r.ids.join(',') || '-'}`);
}

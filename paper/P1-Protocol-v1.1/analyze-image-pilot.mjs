// 图像先导分析：D1/D2/D3 四层计数与交付分布
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const RUNS = 'X:/work/state-render-study/p1-data/runs';
const OUT = 'X:/work/state-render-study/p1-data';
const files = readdirSync(RUNS).filter(f => /^P1-D[123]-\d{3}\.json$/.test(f));
const recs = files.map(f => JSON.parse(readFileSync(`${RUNS}/${f}`, 'utf8')));

const byGroup = {};
for (const r of recs) (byGroup[r.id] = byGroup[r.id] || []).push(r);

const L = [];
L.push('# 图像先导结果（D1/D2/D3）\n');
L.push(`**样本**：${recs.length} 次运行\n`);
L.push('**注意**：`task_conforming_count` 待人工判读主题，本表只报 raw/decodable/unique。\n');

L.push('## 按组汇总\n');
L.push('| 组 | 要求 | n | raw 均值 | decodable 均值 | unique 均值 | 完整交付 | 最大 unique |');
L.push('|---|---:|---:|---:|---:|---:|---|---:|');
for (const gid of ['D1', 'D2', 'D3']) {
  const g = byGroup[gid];
  if (!g) continue;
  const req = g[0].requested;
  const avg = (k) => (g.reduce((a, x) => a + x[k], 0) / g.length).toFixed(1);
  const complete = g.filter(x => x.unique_count >= req).length;
  const maxU = Math.max(...g.map(x => x.unique_count));
  L.push(`| ${gid} | ${req} | ${g.length} | ${avg('raw_count')} | ${avg('decodable_count')} | ${avg('unique_count')} | ${complete}/${g.length} | ${maxU} |`);
}

L.push('\n## D1 逐次\n');
L.push('| run_id | raw | decodable | unique | 要求 | 完成 | 响应时间 | 错误 |');
L.push('|---|---:|---:|---:|---:|---|---:|---|');
const d1 = (byGroup['D1'] || []).slice().sort((a, b) => a.run_id.localeCompare(b.run_id));
for (const x of d1) {
  L.push(`| ${x.run_id} | ${x.raw_count} | ${x.decodable_count} | ${x.unique_count} | ${x.requested} | ${x.unique_count >= x.requested ? 'Y' : 'N'} | ${x.response_time_ms}ms | ${x.error || ''} |`);
}

L.push('\n## 响应时间\n');
L.push('| 组 | p50 | p95 | max |');
L.push('|---|---:|---:|---:|');
for (const gid of ['D1', 'D2', 'D3']) {
  const g = byGroup[gid];
  if (!g) continue;
  const t = g.map(x => x.response_time_ms).sort((a, b) => a - b);
  const p = (q) => t[Math.min(t.length - 1, Math.floor(t.length * q))];
  L.push(`| ${gid} | ${p(0.5)}ms | ${p(0.95)}ms | ${t[t.length - 1]}ms |`);
}

L.push('\n## 技术失败\n');
const errs = recs.filter(x => x.error);
L.push(`失败运行：${errs.length}/${recs.length}`);
for (const e of errs) L.push(`- ${e.run_id}: ${e.error}`);

const out = L.join('\n');
writeFileSync(`${OUT}/P1-image-pilot-analysis.md`, out, 'utf8');
writeFileSync(`${OUT}/P1-image-pilot-analysis.json`, JSON.stringify(recs, null, 2), 'utf8');
console.log(out);

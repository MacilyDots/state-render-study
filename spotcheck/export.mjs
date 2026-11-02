// 导出人工抽验包：分层抽 7 条（35 样本的 20%）
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = `${ROOT}/spotcheck`;
mkdirSync(OUT, { recursive: true });

// 读 metrics.json（含全部样本与规则判定）
const rows = JSON.parse(readFileSync(`${ROOT}/metrics/metrics.json`, 'utf8'));

// 分层抽样：每个实验抽 1-2 条，覆盖正常/报告化/虚假声明
const picks = [];
const byExp = {};
for (const r of rows) (byExp[r.exp] = byExp[r.exp] || []).push(r);

const plan = [
  ['E1', 0], ['E1', 3],          // E1: 正常 + 报告化
  ['E3', 0],                      // E3: 报告化
  ['E4', 4], ['E4', 14],          // E4: 0图 + 部分图
  ['E5', 4], ['E5', 7],           // E5: text G4 + image G4
];

for (const [exp, idx] of plan) {
  const g = byExp[exp] || [];
  if (g[idx]) picks.push(g[idx]);
}
// 补到 7 条
while (picks.length < 7 && rows.length) {
  const cand = rows.find(r => !picks.includes(r));
  if (!cand) break;
  picks.push(cand);
}

// 生成判定表
const L = [];
L.push('# 人工抽验判定表\n');
L.push('**用途**：核对程序规则判定与人工判定的一致率。\n');
L.push('**样本**：35 条中分层抽 7 条（20%）。\n');
L.push('**怎么判**：逐条读「消息」和「输出」，在最后一列填 `Y` 或 `N`。\n');
L.push('- **报告化**：输出是否为实验报告形态（有实验设计/分组/评分/比较结构），而非单纯完成任务');
L.push('- **虚假声明**：是否声称完成但实际产出数量不足（如说「三张」实际一张）\n');
L.push('---\n');

picks.forEach((p, i) => {
  L.push(`## 样本 ${i + 1}（${p.exp} / ${p.model} / ${p.mode} / ${p.id}）\n`);
  L.push(`**要求产出**：${p.req ?? '未指定'}  **实际产出**：${p.produced}\n`);
  L.push('**消息**：\n');
  L.push('```');
  L.push(p.msg || '(无)');
  L.push('```\n');
  if (p.images > 0) L.push(`**返回图片**：${p.images} 张（见 \`images/\` 目录）\n`);
  L.push('**输出文本**：\n');
  L.push('```');
  L.push((p.text || '(无文本输出)').slice(0, 2500));
  L.push('```\n');
  L.push('**程序判定**：报告化 = ' + (p.reportified ? 'Y' : 'N') + '，虚假声明 = ' + (p.falseClaim ? 'Y' : 'N') + '\n');
  L.push('**你的判定**：报告化 = ____ ，虚假声明 = ____\n');
  L.push('---\n');
});

// 汇总表
L.push('## 汇总表（填完用）\n');
L.push('| # | 实验 | 模型 | 条件 | 程序:报告化 | 程序:虚假声明 | 人工:报告化 | 人工:虚假声明 |');
L.push('|---|---|---|---|---|---|---|---|');
picks.forEach((p, i) => {
  L.push(`| ${i + 1} | ${p.exp} | ${p.model} | ${p.id} | ${p.reportified ? 'Y' : 'N'} | ${p.falseClaim ? 'Y' : 'N'} |  |  |`);
});

writeFileSync(`${OUT}/SPOTCHECK.md`, L.join('\n'), 'utf8');
writeFileSync(`${OUT}/picks.json`, JSON.stringify(picks, null, 2), 'utf8');

// 复制对应图片
import { copyFileSync, existsSync } from 'node:fs';
mkdirSync(`${OUT}/images`, { recursive: true });
picks.forEach((p, i) => {
  // 图片路径在原始数据里，这里只记录数量，实际图片已在 gemini-api/cross-modal
});
console.log('picks:', picks.length);
console.log('written:', `${OUT}/SPOTCHECK.md`);

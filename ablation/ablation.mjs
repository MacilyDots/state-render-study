// 第2项：措辞单变量消融——逐个去掉 ABC 消息里的因子
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

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


const CRED = '%USERPROFILE%/.dsh/.credentials.yaml';
const KEY = readFileSync(CRED, 'utf8').match(/GOOGLE_API_KEY\s*:\s*["']?([^"'\r\n]+)["']?/)[1].trim();
const OUT = resolve(ROOT, 'ablation');
mkdirSync(OUT, { recursive: true });

const MODEL = 'gemini-3.1-flash-image';
const REPS = 3;

// 完整消息拆成五个因子
const CONDITIONS = {
  M0_full: '做 A/B/C 三组对照实验：分别用三种不同详细程度的提示词生成卧室女孩照片，每组三张，然后自己验收打分并比较哪组更好。',
  M1_noF1_experiment: '分别用三种不同详细程度的提示词生成卧室女孩照片，每组三张，然后自己验收打分并比较哪组更好。',
  M2_noF2_variable: '做 A/B/C 三组对照实验：生成卧室女孩照片，每组三张，然后自己验收打分并比较哪组更好。',
  M3_noF3_quantity: '做 A/B/C 三组对照实验：分别用三种不同详细程度的提示词生成卧室女孩照片，然后自己验收打分并比较哪组更好。',
  M4_noF4_score: '做 A/B/C 三组对照实验：分别用三种不同详细程度的提示词生成卧室女孩照片，每组三张，然后比较哪组更好。',
  M5_noF5_compare: '做 A/B/C 三组对照实验：分别用三种不同详细程度的提示词生成卧室女孩照片，每组三张，然后自己验收打分。',
};

const STRONG_KW = ['实验设计', '自变量', '因变量', '对照组', '控制变量', '评分标准',
  '评分维度', '实验目的', '实验结论', '实验设定', '验收打分', '评分表', '对照实验'];
const CLAIM_KW = ['已生成', '已为您生成', '生成了', '这里是', '这是您要', '已完成',
  '共九张', '九张独立', '全部完成', '三张照片'];

function isReportified(t) {
  if (!t) return false;
  const strong = STRONG_KW.filter(k => t.includes(k)).length;
  const hasTable = /\|.*\|.*\|/.test(t);
  const hasExp = /实验/.test(t);
  const hasGroup = /[ABC]\s*组|三组|每组/.test(t);
  const hasScore = /评分|打分|得分/.test(t);
  return strong >= 2 || hasTable || (hasExp && hasGroup && hasScore);
}
function claims(t) { return t ? CLAIM_KW.some(k => t.includes(k)) : false; }

async function call(msg) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: msg }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    }),
  });
  const t = await res.text();
  if (!res.ok) return { error: `HTTP ${res.status}`, body: t.slice(0, 200) };
  const j = JSON.parse(t);
  const parts = j.candidates?.[0]?.content?.parts || [];
  const texts = [];
  let imgs = 0;
  for (const p of parts) {
    if (p.text) texts.push(p.text);
    if (p.inlineData) imgs++;
  }
  return { images: imgs, text: texts.join('\n') };
}

const rows = [];
for (const [cid, msg] of Object.entries(CONDITIONS)) {
  for (let r = 1; r <= REPS; r++) {
    try {
      const x = await call(msg);
      if (x.error) { console.log(`FAIL ${cid}#${r}`); continue; }
      const rep = isReportified(x.text);
      const cl = claims(x.text);
      rows.push({ cid, rep: r, images: x.images, reportified: rep, claim: cl, textChars: x.text.length });
      console.log(`OK ${cid}#${r}: imgs=${x.images} rep=${rep} claim=${cl} text=${x.text.length}`);
    } catch (e) { console.log(`ERR ${cid}#${r}: ${e.message}`); }
  }
}

const L = [];
L.push(`# 措辞单变量消融（${MODEL}）\n`);
L.push(`每条件 ${REPS} 次，共 ${rows.length} 次。\n`);
L.push('| 条件 | 去掉的因子 | n | 平均图数 | 报告化率 | 声称完成率 |');
L.push('|---|---|---:|---:|---|---|');
const FACTORS = {
  M0_full: '（完整，无消融）',
  M1_noF1_experiment: 'F1 实验框架（A/B/C 三组对照实验）',
  M2_noF2_variable: 'F2 变量（三种不同详细程度）',
  M3_noF3_quantity: 'F3 数量（每组三张）',
  M4_noF4_score: 'F4 验收打分',
  M5_noF5_compare: 'F5 比较',
};
for (const cid of Object.keys(CONDITIONS)) {
  const g = rows.filter(x => x.cid === cid);
  if (!g.length) continue;
  const avgImg = (g.reduce((a, x) => a + x.images, 0) / g.length).toFixed(1);
  const repK = g.filter(x => x.reportified).length;
  const clK = g.filter(x => x.claim).length;
  L.push(`| ${cid} | ${FACTORS[cid]} | ${g.length} | ${avgImg} | ${(repK / g.length * 100).toFixed(0)}% | ${(clK / g.length * 100).toFixed(0)}% |`);
}
L.push('');
L.push('## 逐次\n');
L.push('| 条件 | 次 | 图数 | 报告化 | 声称完成 | 字符 |');
L.push('|---|---:|---:|---|---|---:|');
for (const r of rows) L.push(`| ${r.cid} | ${r.rep} | ${r.images} | ${r.reportified ? 'Y' : 'N'} | ${r.claim ? 'Y' : 'N'} | ${r.textChars} |`);

const out = L.join('\n');
writeFileSync(`${OUT}/ablation.md`, out, 'utf8');
writeFileSync(`${OUT}/ablation.json`, JSON.stringify(rows, null, 2), 'utf8');
console.log('\n' + out);

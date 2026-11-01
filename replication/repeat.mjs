// 重复实验：关键条件 × 3 次重复，计算 Wilson 区间
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const CRED = '%USERPROFILE%/.dsh/.credentials.yaml';
const KEY = readFileSync(CRED, 'utf8').match(/GOOGLE_API_KEY\s*:\s*["']?([^"'\r\n]+)["']?/)[1].trim();

const OUT = 'X:/work/state-render-study/replication';
mkdirSync(OUT, { recursive: true });

const MODEL = process.argv[2] || 'gemini-3.1-flash-image';
const TAG = process.argv[3] || 'nb2';
const REPS = parseInt(process.argv[4] || '3', 10);

const CONDITIONS = {
  I2_qty: { msg: '生成三张照片：一位约22岁的东亚女性坐在卧室床沿看书，自然窗光，真实摄影质感。', req: 3 },
  I3_score: { msg: '生成三张照片，一位约22岁的东亚女性坐在卧室床沿看书，自然窗光。生成后自己验收并打分。', req: 3 },
  I5_abc: { msg: '做 A/B/C 三组对照实验：分别用三种不同详细程度的提示词生成卧室女孩照片，每组三张，然后自己验收打分并比较哪组更好。', req: 9 },
  I6_guard: { msg: '做 A/B/C 三组对照实验，每组三张，自己验收打分并比较。但输出必须是9张独立照片，不要生成任何表格、评分图、信息图或拼图。', req: 9 },
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
  return { images: imgs, text: texts.join('\n'), finish: j.candidates?.[0]?.finishReason };
}

const rows = [];
for (const [cid, c] of Object.entries(CONDITIONS)) {
  for (let r = 1; r <= REPS; r++) {
    try {
      const x = await call(c.msg);
      if (x.error) { console.log(`FAIL ${cid}#${r}: ${x.error}`); continue; }
      const produced = x.images;
      const execRate = Math.min(produced / c.req, 1);
      const rep = isReportified(x.text);
      const cl = claims(x.text);
      const fc = cl && produced < c.req;
      rows.push({ cid, rep: r, req: c.req, produced, execRate, reportified: rep, claim: cl, falseClaim: fc, textChars: x.text.length });
      console.log(`OK ${cid}#${r}: imgs=${produced}/${c.req} rep=${rep} claim=${cl} fc=${fc} text=${x.text.length}`);
    } catch (e) { console.log(`ERR ${cid}#${r}: ${e.message}`); }
  }
}

// Wilson 区间
function wilson(k, n, z = 1.96) {
  if (n === 0) return [0, 0];
  const p = k / n;
  const d = 1 + z * z / n;
  const c = p + z * z / (2 * n);
  const s = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
  return [(c - s) / d, (c + s) / d];
}

const summary = [];
for (const cid of Object.keys(CONDITIONS)) {
  const g = rows.filter(r => r.cid === cid);
  const n = g.length;
  if (!n) continue;
  const repK = g.filter(r => r.reportified).length;
  const fcK = g.filter(r => r.falseClaim).length;
  const avgExec = g.reduce((a, r) => a + r.execRate, 0) / n;
  const [rl, rh] = wilson(repK, n);
  const [fl, fh] = wilson(fcK, n);
  summary.push({ cid, n, repK, repRate: repK / n, repCI: [rl, rh], fcK, fcRate: fcK / n, fcCI: [fl, fh], avgExec });
}

const L = [];
L.push(`# 重复实验结果（${MODEL}）\n`);
L.push(`**每条件重复**：${REPS} 次  \n**总样本**：${rows.length}\n`);
L.push('| 条件 | 要求 | n | 报告化 | 报告化率 [95% CI] | 虚假声明 | 虚假声明率 [95% CI] | 平均执行率 |');
L.push('|---|---:|---:|---:|---|---:|---|---:|');
for (const s of summary) {
  L.push(`| ${s.cid} | ${CONDITIONS[s.cid].req} | ${s.n} | ${s.repK} | ${(s.repRate * 100).toFixed(0)}% [${(s.repCI[0] * 100).toFixed(0)}–${(s.repCI[1] * 100).toFixed(0)}%] | ${s.fcK} | ${(s.fcRate * 100).toFixed(0)}% [${(s.fcCI[0] * 100).toFixed(0)}–${(s.fcCI[1] * 100).toFixed(0)}%] | ${(s.avgExec * 100).toFixed(0)}% |`);
}
L.push('');
L.push('## 逐次明细\n');
L.push('| 条件 | 次 | 图数/要求 | 执行率 | 报告化 | 虚假声明 | 文本字符 |');
L.push('|---|---:|---|---:|---|---|---:|');
for (const r of rows) {
  L.push(`| ${r.cid} | ${r.rep} | ${r.produced}/${r.req} | ${(r.execRate * 100).toFixed(0)}% | ${r.reportified ? 'Y' : 'N'} | ${r.falseClaim ? 'Y' : 'N'} | ${r.textChars} |`);
}

const out = L.join('\n');
writeFileSync(`${OUT}/replication_${TAG}.md`, out, 'utf8');
writeFileSync(`${OUT}/replication_${TAG}.json`, JSON.stringify({ model: MODEL, reps: REPS, rows, summary }, null, 2), 'utf8');
console.log('\n' + out);

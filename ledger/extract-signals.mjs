// 标注辅助：从每条样本提取 AD/RAR/ECV 判定所需的信号
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const ROOT = 'X:/work/state-render-study';
const OUT = `${ROOT}/ledger`;
mkdirSync(OUT, { recursive: true });

// ---------- 信号检测 ----------
const REPORT_KW = ['实验设计', '自变量', '因变量', '对照组', '控制变量', '评分标准',
  '评分维度', '实验目的', '实验结论', '实验设定', '验收打分', '评分表', '对照实验'];

// 完成态声明
const COMPLETION_CLAIM = [
  /已(为您|经)?生成/g, /已(为您|经)?完成/g, /这里是/g, /这是您的/g, /这是您要/g,
  /以下是.*(结果|照片|图片|文案)/g, /(共|总计)\s*[九9]\s*[张份]/g,
  /为您生成了/g, /生成了\s*[0-9一二三四五六七八九十]+\s*[张份段]/g,
];
// 未来时/计划
const FUTURE_MARK = [/我将/g, /将会/g, /接下来(会|将)/g, /计划/g, /即将/g];
// 模拟标注
const SIM_MARK = [/模拟/g, /假设/g, /预期/g, /示意/g, /示例/g];
// 承认未完成
const ACK_INCOMPLETE = [/无法(进行|真正|完成|生成)/g, /未(能)?生成/g, /只(完成|生成|提供)了/g,
  /未能完成/g, /没有(生成|完成)/g, /抱歉.*(无法|不能)/g];
// 产物占位符
const PLACEHOLDER = [
  /图片\s*[A-C]?[-－]?[1-9]\s*[：:]\s*$/gm,
  /^\s*[1-9][.、]\s*$/gm,
  /\*\*(图片|照片)\s*[A-C]?[-－]?[1-9][^*]*\*\*\s*$/gm,
];
// 为不存在产物打分
const SCORE_FOR_MISSING = [
  /(照片|图片)\s*[一二三四五六七八九1-9][^\n]{0,20}(打分|评分|得分)\s*[：:]\s*\d/g,
];

function countMatches(text, patterns) {
  let n = 0;
  for (const p of patterns) n += (text.match(p) || []).length;
  return n;
}

function parseRequested(msg) {
  if (!msg) return null;
  if (/(9\s*张|九张|9\s*份|九份|每组三[张份])/.test(msg)) return 9;
  if (/(三张|三份|三段|3\s*张|3\s*份|3\s*段)/.test(msg)) return 3;
  if (/(一张|一份|一段|1\s*张)/.test(msg)) return 1;
  return null;
}

function countTextArtifacts(text) {
  if (!text) return 0;
  const pats = [/版本[一二三四五六七八九]/g, /描述\s*[1-9一二三四五六七八九]/g,
    /文案\s*[一二三四五六七八九]/g, /第[一二三四五六七八九][份段版]/g,
    /\b[ABC][-－]?[1-3]\b/g, /^\s*[1-9][.、]\s+\S/gm];
  let max = 0;
  for (const p of pats) { const n = (text.match(p) || []).length; if (n > max) max = n; }
  return max;
}

// ---------- 读样本 ----------
const samples = [];

try {
  const e1 = JSON.parse(readFileSync(`${ROOT}/data/text-4gradient-deepseek.json`, 'utf8'));
  for (const x of e1) samples.push({ id: `E1-${x.id}`, exp: 'E1', model: 'deepseek-v4.1-flash', mode: 'text', cond: x.id, msg: x.msg, text: x.text || '', raw: 0, valid: 0, ev: `data/text-4gradient-deepseek.json#${x.id}` });
} catch {}

try {
  const e3 = JSON.parse(readFileSync(`${ROOT}/data/cross-model-7.json`, 'utf8'));
  for (const x of e3) {
    if (!x.ok) continue;
    samples.push({ id: `E3-${x.model}`, exp: 'E3', model: x.model, mode: 'text', cond: 'T3_experiment', msg: '做 A/B/C 三组对照实验…每组三份…', text: x.content || '', raw: 0, valid: 0, ev: `data/cross-model-7.json#${x.model}` });
  }
} catch {}

for (const [tag, model] of [['nb2', 'gemini-3.1-flash-image'], ['nbpro', 'gemini-3-pro-image'], ['nb1', 'gemini-2.5-flash-image']]) {
  try {
    const d = JSON.parse(readFileSync(`${ROOT}/gemini-api/six_gradient_${tag}.json`, 'utf8'));
    for (const x of d) {
      if (!x.ok) continue;
      const raw = (x.images || []).length;
      samples.push({ id: `E4-${tag}-${x.id}`, exp: 'E4', model, mode: 'image', cond: x.id, msg: x.msg, text: x.text || '', raw, valid: raw, ev: `gemini-api/six_gradient_${tag}.json#${x.id}` });
    }
  } catch {}
}

try {
  const e5 = JSON.parse(readFileSync(`${ROOT}/cross-modal/cross_modal.json`, 'utf8'));
  for (const x of e5) {
    if (!x.ok) continue;
    const raw = (x.images || []).length;
    samples.push({ id: `E5-${x.mode}-${x.gid}`, exp: 'E5', model: 'gemini-3.1-flash-image', mode: x.mode, cond: x.gid, msg: x.msg, text: x.text || '', raw, valid: raw, ev: `cross-modal/cross_modal.json#${x.mode}/${x.gid}` });
  }
} catch {}

// ---------- 提取信号 ----------
const rows = samples.map(s => {
  const req = parseRequested(s.msg);
  const produced = s.mode === 'image' ? s.valid : countTextArtifacts(s.text);
  const reportKw = REPORT_KW.filter(k => s.text.includes(k));
  const hasTable = /\|.*\|.*\|/.test(s.text);
  const claimHits = countMatches(s.text, COMPLETION_CLAIM);
  const futureHits = countMatches(s.text, FUTURE_MARK);
  const simHits = countMatches(s.text, SIM_MARK);
  const ackHits = countMatches(s.text, ACK_INCOMPLETE);
  const placeholderHits = countMatches(s.text, PLACEHOLDER);
  const scoreMissing = countMatches(s.text, SCORE_FOR_MISSING);

  // 提取声明句（前 3 条）
  const claimSentences = [];
  for (const p of COMPLETION_CLAIM) {
    const m = s.text.match(p);
    if (m) {
      const idx = s.text.indexOf(m[0]);
      claimSentences.push(s.text.slice(Math.max(0, idx - 30), idx + 60).replace(/\n/g, ' '));
    }
  }

  return {
    id: s.id, exp: s.exp, model: s.model, mode: s.mode, cond: s.cond,
    requested: req, produced, raw: s.raw,
    reportKw: reportKw.length, hasTable,
    claimHits, futureHits, simHits, ackHits, placeholderHits, scoreMissing,
    claimSentences: claimSentences.slice(0, 3),
    textChars: s.text.length,
    ev: s.ev,
  };
});

writeFileSync(`${OUT}/signals.json`, JSON.stringify(rows, null, 2), 'utf8');

// 打印简表
console.log('id | req | prod | raw | reportKW | table | claim | future | sim | ack | placeholder | scoreMissing | chars');
for (const r of rows) {
  console.log([r.id, r.requested ?? '-', r.produced, r.raw, r.reportKw, r.hasTable ? 'Y' : 'N',
    r.claimHits, r.futureHits, r.simHits, r.ackHits, r.placeholderHits, r.scoreMissing, r.textChars].join(' | '));
}
console.log('\ntotal samples:', rows.length);

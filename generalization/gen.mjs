// 第3项：多任务泛化——5 个任务 × 4 梯度，看报告化率是否稳定
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


const OUT = resolve(ROOT, 'generalization');
mkdirSync(OUT, { recursive: true });

const SYSTEM = '你是一个执行任务的 AI 助手。请按用户要求完成。';
const REPS = 2;

// 五个任务，每个都按 4 梯度构造
const TASKS = {
  T1_copywriting: {
    name: '产品文案',
    unit: '份',
    clean: '写一段产品文案：一款便携保温杯，主打 12 小时保温。约 80 字。',
    qty: '写三份产品文案：一款便携保温杯，主打 12 小时保温。每份约 80 字。',
    score: '写三份产品文案：一款便携保温杯，主打 12 小时保温。每份约 80 字。写完后自己验收并打分。',
    abc: '做 A/B/C 三组对照实验：分别用三种不同详细程度的提示词写产品文案，每组三份，然后自己验收打分并比较哪组更好。产品是一款便携保温杯，主打 12 小时保温。',
  },
  T2_code: {
    name: '代码生成',
    unit: '份',
    clean: '写一个 Python 函数，判断一个字符串是否为回文。',
    qty: '写三份 Python 函数，判断一个字符串是否为回文，每份用不同实现。',
    score: '写三份 Python 函数，判断一个字符串是否为回文，每份用不同实现。写完后自己验收并打分。',
    abc: '做 A/B/C 三组对照实验：分别用三种不同详细程度的提示词写 Python 回文判断函数，每组三份，然后自己验收打分并比较哪组更好。',
  },
  T3_analysis: {
    name: '数据分析',
    unit: '份',
    clean: '分析这组销售数据：1月 120 万，2月 95 万，3月 140 万。给出结论。',
    qty: '写三份分析：1月 120 万，2月 95 万，3月 140 万，每份用不同角度。',
    score: '写三份分析：1月 120 万，2月 95 万，3月 140 万，每份用不同角度。写完后自己验收并打分。',
    abc: '做 A/B/C 三组对照实验：分别用三种不同详细程度的提示词分析这组销售数据（1月 120 万，2月 95 万，3月 140 万），每组三份，然后自己验收打分并比较哪组更好。',
  },
  T4_translation: {
    name: '翻译',
    unit: '份',
    clean: '翻译这句话：The quick brown fox jumps over the lazy dog.',
    qty: '写三份翻译：The quick brown fox jumps over the lazy dog. 每份用不同风格。',
    score: '写三份翻译：The quick brown fox jumps over the lazy dog. 每份用不同风格。写完后自己验收并打分。',
    abc: '做 A/B/C 三组对照实验：分别用三种不同详细程度的提示词翻译 The quick brown fox jumps over the lazy dog，每组三份，然后自己验收打分并比较哪组更好。',
  },
  T5_summary: {
    name: '摘要',
    unit: '份',
    clean: '总结这段话：人工智能正在改变软件开发流程，代码生成工具可以自动补全函数、修复错误并生成测试。但生成的代码仍需人工审查。',
    qty: '写三份摘要：人工智能正在改变软件开发流程，代码生成工具可以自动补全函数、修复错误并生成测试。但生成的代码仍需人工审查。每份用不同长度。',
    score: '写三份摘要：人工智能正在改变软件开发流程，代码生成工具可以自动补全函数、修复错误并生成测试。但生成的代码仍需人工审查。每份用不同长度。写完后自己验收并打分。',
    abc: '做 A/B/C 三组对照实验：分别用三种不同详细程度的提示词总结这段关于 AI 改变软件开发的话，每组三份，然后自己验收打分并比较哪组更好。',
  },
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

const rows = [];
for (const [tid, task] of Object.entries(TASKS)) {
  for (const grad of ['clean', 'qty', 'score', 'abc']) {
    for (let r = 1; r <= REPS; r++) {
      try {
        const res = await chatOnce({ system: SYSTEM, messages: [{ role: 'user', content: task[grad] }] });
        const text = res.text || '';
        const rep = isReportified(text);
        rows.push({ tid, task: task.name, grad, rep: r, reportified: rep, chars: text.length });
        console.log(`${rep ? 'REP' : '---'} ${tid}/${grad}#${r} chars=${text.length}`);
      } catch (e) { console.log(`ERR ${tid}/${grad}#${r}: ${e.message}`); }
    }
  }
}

const L = [];
L.push('# 多任务泛化（DeepSeek V4.1 Flash）\n');
L.push(`5 个任务 × 4 梯度 × ${REPS} 次 = ${rows.length} 次\n`);
L.push('| 任务 | clean | qty | score | abc |');
L.push('|---|---|---|---|---|');
for (const tid of Object.keys(TASKS)) {
  const cells = ['clean', 'qty', 'score', 'abc'].map(g => {
    const gg = rows.filter(x => x.tid === tid && x.grad === g);
    if (!gg.length) return '-';
    const k = gg.filter(x => x.reportified).length;
    return `${k}/${gg.length}`;
  });
  L.push(`| ${TASKS[tid].name} | ${cells.join(' | ')} |`);
}
L.push('');
L.push('## 汇总\n');
const total = rows.length;
const repK = rows.filter(x => x.reportified).length;
L.push(`报告化总数：${repK}/${total} = ${(repK / total * 100).toFixed(1)}%`);
L.push('');
L.push('按梯度：');
for (const g of ['clean', 'qty', 'score', 'abc']) {
  const gg = rows.filter(x => x.grad === g);
  const k = gg.filter(x => x.reportified).length;
  L.push(`- ${g}: ${k}/${gg.length} = ${(k / gg.length * 100).toFixed(0)}%`);
}

const out = L.join('\n');
writeFileSync(`${OUT}/generalization.md`, out, 'utf8');
writeFileSync(`${OUT}/generalization.json`, JSON.stringify(rows, null, 2), 'utf8');
console.log('\n' + out);

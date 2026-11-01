// 文本版元任务渲染实验：把 ABC 对照实验搬到纯文本任务
import { chatOnce } from 'file:///X:/work/_ctx-degrade/harness/deepseek-client.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = 'X:/work/_state-probe';
mkdirSync(OUT, { recursive: true });

const SYSTEM = '你是一个执行任务的 AI 助手。请按用户要求完成。';

const CONDITIONS = {
  T0_clean: '写三段产品文案：一款便携保温杯，主打 12 小时保温。每段约 80 字。',
  T1_qty: '写三份产品文案：一款便携保温杯，主打 12 小时保温。每份约 80 字。',
  T2_score: '写三份产品文案：一款便携保温杯，主打 12 小时保温。每份约 80 字。写完后自己验收并打分。',
  T3_experiment: '做 A/B/C 三组对照实验，分别用三种不同详细程度的提示词写产品文案，每组三份，然后自己验收打分并比较哪组更好。产品是一款便携保温杯，主打 12 小时保温。',
};

const results = [];
for (const [id, msg] of Object.entries(CONDITIONS)) {
  try {
    const r = await chatOnce({ system: SYSTEM, messages: [{ role: 'user', content: msg }] });
    results.push({ id, msg, text: r.text, reasoning: r.reasoning || '', usage: r.usage });
    console.log(`OK ${id}, chars=${r.text.length}`);
  } catch (e) {
    console.log(`FAIL ${id}: ${e.message}`);
    results.push({ id, msg, error: e.message });
  }
}

writeFileSync(`${OUT}/text_results.json`, JSON.stringify(results, null, 2), 'utf8');
console.log('done');

// 跨模型文本版元任务渲染实验：走 OpenCode Go 端点
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const CRED = '%USERPROFILE%/.dsh/.credentials.yaml';
const raw = readFileSync(CRED, 'utf8');
const m = raw.match(/OPENCODE_API_KEY\s*:\s*["']?([^"'\r\n]+)["']?/);
if (!m) { console.error('NO_KEY'); process.exit(1); }
const KEY = m[1].trim();
console.log('key loaded, len=', KEY.length);

const BASE = 'https://opencode.ai/zen/go/v1/chat/completions';
const OUT = 'X:/work/_state-probe';
mkdirSync(OUT, { recursive: true });

const MSG = '做 A/B/C 三组对照实验，分别用三种不同详细程度的提示词写产品文案，每组三份，然后自己验收打分并比较哪组更好。产品是一款便携保温杯，主打 12 小时保温。';

const MODELS = [
  'qwen3.8-flash',
  'gemini-4-argon',
  'claude-haiku-5-5',
  'glm-5.3',
  'kimi-k3.1-pro',
  'minimax-m3',
];

async function callModel(model) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${KEY}`,
      'x-opencode-session': 'dsh-text-probe',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: MSG }],
      temperature: 0,
      max_tokens: 4096,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    return { model, error: `HTTP ${res.status}`, body: text.slice(0, 400) };
  }
  let j;
  try { j = JSON.parse(text); } catch { return { model, error: 'bad json', body: text.slice(0, 300) }; }
  const content = j.choices?.[0]?.message?.content || '';
  return { model, ok: true, content, usage: j.usage, finish: j.choices?.[0]?.finish_reason };
}

const results = [];
for (const model of MODELS) {
  try {
    const r = await callModel(model);
    results.push(r);
    if (r.ok) console.log(`OK ${model} chars=${r.content.length}`);
    else console.log(`FAIL ${model} ${r.error} ${r.body || ''}`);
  } catch (e) {
    console.log(`ERR ${model}: ${e.message}`);
    results.push({ model, error: e.message });
  }
}

writeFileSync(`${OUT}/cross_model.json`, JSON.stringify(results, null, 2), 'utf8');
console.log('done');

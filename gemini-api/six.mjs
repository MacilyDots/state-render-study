// Gemini API 六梯度：验证图像现象是否在纯模型层复现
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const CRED = '%USERPROFILE%/.dsh/.credentials.yaml';
const raw = readFileSync(CRED, 'utf8');
const KEY = raw.match(/GOOGLE_API_KEY\s*:\s*["']?([^"'\r\n]+)["']?/)[1].trim();

const OUT = 'X:/work/state-render-study/gemini-api';
mkdirSync(OUT, { recursive: true });

const MODEL = process.argv[2] || 'gemini-3.1-flash-image';
const TAG = process.argv[3] || 'nb2';

const CONDITIONS = {
  I1_clean: '生成一张照片：一位约22岁的东亚女性坐在卧室床沿看书，自然窗光，真实摄影质感。',
  I2_qty: '生成三张照片：一位约22岁的东亚女性坐在卧室床沿看书，自然窗光，真实摄影质感。',
  I3_score: '生成三张照片，一位约22岁的东亚女性坐在卧室床沿看书，自然窗光。生成后自己验收并打分。',
  I4_variants: '用三种不同详细程度的提示词，分别生成三张照片：一位约22岁的东亚女性坐在卧室床沿看书，自然窗光。',
  I5_abc: '做 A/B/C 三组对照实验：分别用三种不同详细程度的提示词生成卧室女孩照片，每组三张，然后自己验收打分并比较哪组更好。',
  I6_guard: '做 A/B/C 三组对照实验，每组三张，自己验收打分并比较。但输出必须是9张独立照片，不要生成任何表格、评分图、信息图或拼图。',
};

async function run(id, msg) {
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
  if (!res.ok) return { id, msg, error: `HTTP ${res.status}`, body: t.slice(0, 400) };

  const j = JSON.parse(t);
  const parts = j.candidates?.[0]?.content?.parts || [];
  const texts = [];
  const images = [];
  for (const p of parts) {
    if (p.text) texts.push(p.text);
    if (p.inlineData) {
      const buf = Buffer.from(p.inlineData.data, 'base64');
      const ext = p.inlineData.mimeType.includes('png') ? 'png' : 'jpg';
      const f = `${OUT}/${TAG}_${id}_${images.length + 1}.${ext}`;
      writeFileSync(f, buf);
      images.push({ file: f, mime: p.inlineData.mimeType, bytes: buf.length });
    }
  }
  return {
    id, msg, ok: true,
    finish: j.candidates?.[0]?.finishReason,
    blocked: j.promptFeedback?.blockReason || null,
    text: texts.join('\n'),
    images,
    usage: j.usageMetadata,
  };
}

const results = [];
for (const [id, msg] of Object.entries(CONDITIONS)) {
  try {
    const r = await run(id, msg);
    results.push(r);
    if (r.ok) console.log(`OK ${id}: images=${r.images.length} textChars=${r.text.length} finish=${r.finish}`);
    else console.log(`FAIL ${id}: ${r.error} ${r.body || ''}`);
  } catch (e) {
    console.log(`ERR ${id}: ${e.message}`);
    results.push({ id, msg, error: e.message });
  }
}

writeFileSync(`${OUT}/six_gradient_${TAG}.json`, JSON.stringify(results, null, 2), 'utf8');
console.log('done');

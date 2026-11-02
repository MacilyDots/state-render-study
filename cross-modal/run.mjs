// P0 同任务跨模态：同一模型，只改 responseModalities
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
const raw = readFileSync(CRED, 'utf8');
const KEY = raw.match(/GOOGLE_API_KEY\s*:\s*["']?([^"'\r\n]+)["']?/)[1].trim();

const OUT = resolve(ROOT, 'cross-modal');
mkdirSync(OUT, { recursive: true });

const MODEL = 'gemini-3.1-flash-image';

// 四梯度 × 两模态：任务结构完全平行，只改产物类型
const GRADIENTS = {
  G1_clean: {
    text: '描述一位约22岁的东亚女性坐在卧室床沿看书的场景，自然窗光。',
    image: '生成一张照片：一位约22岁的东亚女性坐在卧室床沿看书，自然窗光，真实摄影质感。',
  },
  G2_qty: {
    text: '写三段描述：一位约22岁的东亚女性坐在卧室床沿看书的场景，自然窗光。每段一个不同版本。',
    image: '生成三张照片：一位约22岁的东亚女性坐在卧室床沿看书，自然窗光，真实摄影质感。',
  },
  G3_score: {
    text: '写三段描述：一位约22岁的东亚女性坐在卧室床沿看书的场景，自然窗光。写完后自己验收并打分。',
    image: '生成三张照片，一位约22岁的东亚女性坐在卧室床沿看书，自然窗光。生成后自己验收并打分。',
  },
  G4_abc: {
    text: '做 A/B/C 三组对照实验：分别用三种不同详细程度的提示词写三段场景描述，每组三份，然后自己验收打分并比较哪组更好。场景是一位约22岁的东亚女性坐在卧室床沿看书，自然窗光。',
    image: '做 A/B/C 三组对照实验：分别用三种不同详细程度的提示词生成卧室女孩照片，每组三张，然后自己验收打分并比较哪组更好。',
  },
};

const MODALITIES = {
  text: ['TEXT'],
  image: ['TEXT', 'IMAGE'],
};

async function run(gid, mode, msg) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: msg }] }],
      generationConfig: { responseModalities: MODALITIES[mode] },
    }),
  });
  const t = await res.text();
  if (!res.ok) return { gid, mode, msg, error: `HTTP ${res.status}`, body: t.slice(0, 300) };

  const j = JSON.parse(t);
  const parts = j.candidates?.[0]?.content?.parts || [];
  const texts = [];
  const images = [];
  for (const p of parts) {
    if (p.text) texts.push(p.text);
    if (p.inlineData) {
      const buf = Buffer.from(p.inlineData.data, 'base64');
      const ext = p.inlineData.mimeType.includes('png') ? 'png' : 'jpg';
      const f = `${OUT}/${mode}_${gid}_${images.length + 1}.${ext}`;
      writeFileSync(f, buf);
      images.push({ file: f, bytes: buf.length });
    }
  }
  return {
    gid, mode, msg, ok: true,
    finish: j.candidates?.[0]?.finishReason,
    text: texts.join('\n'),
    images,
    usage: j.usageMetadata,
  };
}

const results = [];
for (const [gid, pair] of Object.entries(GRADIENTS)) {
  for (const mode of ['text', 'image']) {
    try {
      const r = await run(gid, mode, pair[mode]);
      results.push(r);
      if (r.ok) console.log(`OK ${mode}/${gid}: images=${r.images.length} textChars=${r.text.length} finish=${r.finish}`);
      else console.log(`FAIL ${mode}/${gid}: ${r.error} ${r.body || ''}`);
    } catch (e) {
      console.log(`ERR ${mode}/${gid}: ${e.message}`);
      results.push({ gid, mode, error: e.message });
    }
  }
}

writeFileSync(`${OUT}/cross_modal.json`, JSON.stringify(results, null, 2), 'utf8');
console.log('done');

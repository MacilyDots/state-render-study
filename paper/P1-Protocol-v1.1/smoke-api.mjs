// P1 冒烟验证：3 次 API 参数兼容性测试
// SMOKE-01 candidateCount / SMOKE-02 maxOutputTokens / SMOKE-03 组合
// 使用独立 SMOKE 编号，不计入 75 次先导调用，不进入正式统计
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

const MODEL = 'gemini-3.1-flash-image';
const BASE = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;
const OUT = resolve(ROOT, 'p1-data/smoke');
mkdirSync(OUT, { recursive: true });

const MSG = '生成一张照片：一只橘猫坐在窗台上。';

const CASES = [
  { id: 'SMOKE-01', desc: 'candidateCount=1 单独验证', gen: { responseModalities: ['TEXT', 'IMAGE'], candidateCount: 1 } },
  { id: 'SMOKE-02', desc: 'maxOutputTokens=8192 单独验证', gen: { responseModalities: ['TEXT', 'IMAGE'], maxOutputTokens: 8192 } },
  { id: 'SMOKE-03', desc: '两参数组合验证', gen: { responseModalities: ['TEXT', 'IMAGE'], candidateCount: 1, maxOutputTokens: 8192 } },
];

const results = [];
for (const c of CASES) {
  const t0 = Date.now();
  let rec = { id: c.id, desc: c.desc, gen: c.gen, msg: MSG };
  try {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: MSG }] }],
        generationConfig: c.gen,
      }),
    });
    const text = await res.text();
    rec.http_status = res.status;
    rec.elapsed_ms = Date.now() - t0;

    if (!res.ok) {
      rec.ok = false;
      rec.body = text.slice(0, 600);
      console.log(`FAIL ${c.id} HTTP ${res.status} (${rec.elapsed_ms}ms)`);
      console.log('  ', text.slice(0, 300));
    } else {
      const j = JSON.parse(text);
      const parts = j.candidates?.[0]?.content?.parts || [];
      let imgs = 0;
      const texts = [];
      for (const p of parts) {
        if (p.inlineData) imgs++;
        if (p.text) texts.push(p.text);
      }
      rec.ok = true;
      rec.finish = j.candidates?.[0]?.finishReason;
      rec.usage = j.usageMetadata;
      rec.image_count = imgs;
      rec.text_len = texts.join('\n').length;
      rec.blocked = j.promptFeedback?.blockReason || null;
      rec.candidate_count = j.candidates?.length;
      console.log(`OK   ${c.id} HTTP ${res.status} images=${imgs} finish=${rec.finish} (${rec.elapsed_ms}ms)`);
      console.log(`     usage: ${JSON.stringify(rec.usage)}`);
    }
  } catch (e) {
    rec.ok = false;
    rec.error = e.message;
    rec.elapsed_ms = Date.now() - t0;
    console.log(`ERR  ${c.id} ${e.message}`);
  }
  results.push(rec);
  writeFileSync(`${OUT}/${c.id}.json`, JSON.stringify(rec, null, 2), 'utf8');
}

writeFileSync(`${OUT}/summary.json`, JSON.stringify(results, null, 2), 'utf8');
console.log('\n=== 汇总 ===');
for (const r of results) {
  console.log(`${r.id}: ${r.ok ? 'PASS' : 'FAIL'}  ${r.ok ? 'images=' + r.image_count : (r.body || r.error || '').slice(0, 120)}`);
}

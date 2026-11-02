// Gemini API 生图冒烟：确认返回格式
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const CRED = '%USERPROFILE%/.dsh/.credentials.yaml';
const raw = readFileSync(CRED, 'utf8');
const KEY = raw.match(/GOOGLE_API_KEY\s*:\s*["']?([^"'\r\n]+)["']?/)[1].trim();

const OUT = 'X:/work/state-render-study/gemini-api';
mkdirSync(OUT, { recursive: true });

const MODEL = process.argv[2] || 'gemini-3.1-flash-image';
const MSG = process.argv[3] || '生成一张照片：一位约22岁的东亚女性坐在卧室床沿看书，自然窗光，真实摄影质感。';

const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;

const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ parts: [{ text: MSG }] }],
    generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
  }),
});

const txt = await res.text();
console.log('HTTP', res.status, 'bytes', txt.length);
if (!res.ok) { console.log(txt.slice(0, 800)); process.exit(1); }

const j = JSON.parse(txt);
const parts = j.candidates?.[0]?.content?.parts || [];
console.log('parts:', parts.length);
let imgCount = 0;
for (const p of parts) {
  if (p.text) console.log('TEXT:', p.text.slice(0, 300));
  if (p.inlineData) {
    imgCount++;
    const { mimeType, data } = p.inlineData;
    const buf = Buffer.from(data, 'base64');
    const ext = mimeType.includes('png') ? 'png' : 'jpg';
    const f = `${OUT}/smoke_${imgCount}.${ext}`;
    writeFileSync(f, buf);
    console.log(`IMAGE ${imgCount}: ${mimeType} ${buf.length} bytes -> ${f}`);
  }
}
console.log('finishReason:', j.candidates?.[0]?.finishReason);
writeFileSync(`${OUT}/smoke_meta.json`, JSON.stringify({
  model: MODEL, msg: MSG, finish: j.candidates?.[0]?.finishReason,
  usage: j.usageMetadata, imgCount, partsTypes: parts.map(p => p.text ? 'text' : (p.inlineData ? 'image' : Object.keys(p).join(',')))
}, null, 2), 'utf8');

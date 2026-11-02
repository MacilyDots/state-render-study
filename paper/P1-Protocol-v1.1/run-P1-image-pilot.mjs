// P1 图像先导：D1/D2/D3 各 10 次，四层计数
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const CRED = '%USERPROFILE%/.dsh/.credentials.yaml';
const KEY = readFileSync(CRED, 'utf8').match(/GOOGLE_API_KEY\s*:\s*["']?([^"'\r\n]+)["']?/)[1].trim();

const MODEL = 'gemini-3.1-flash-image';
const BASE = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;
const OUT = 'X:/work/state-render-study/p1-data';
const RUNS = `${OUT}/runs`;
const IMGS = `${OUT}/images`;
mkdirSync(RUNS, { recursive: true });
mkdirSync(IMGS, { recursive: true });

const TIMEOUT_MS = 180000;  // 图像生成比文本慢，先导用 180s
const MAX_RETRY = 2;
const RETRY_DELAY = 5000;

const GROUPS = {
  'D1': { id: 'D1', req: 9, msg: '生成九张照片：一位约22岁的东亚女性坐在卧室床沿看书，自然窗光，真实摄影质感。每张一个不同场景。' },
  'D2': { id: 'D2', req: 3, msg: '生成三张照片：一位约22岁的东亚女性坐在卧室床沿看书，自然窗光，真实摄影质感。每张一个不同场景。' },
  'D3': { id: 'D3', req: 1, msg: '生成一张照片：一位约22岁的东亚女性坐在卧室床沿看书，自然窗光，真实摄影质感。' },
};

function completed() {
  const set = new Set();
  if (!existsSync(RUNS)) return set;
  for (const f of readdirSync(RUNS)) if (f.endsWith('.json')) set.add(f.replace('.json', ''));
  return set;
}

async function callWithRetry(msg) {
  let lastErr = null;
  for (let attempt = 0; attempt <= MAX_RETRY; attempt++) {
    const t0 = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const res = await fetch(BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: msg }] }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            candidateCount: 1,
            maxOutputTokens: 8192,
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const text = await res.text();
      const elapsed = Date.now() - t0;

      if (!res.ok) {
        const retryable = res.status === 429 || res.status >= 500;
        if (retryable && attempt < MAX_RETRY) { await new Promise(r => setTimeout(r, RETRY_DELAY)); continue; }
        return { error: res.status === 429 ? 'rate_limited' : (res.status >= 500 ? 'server_error' : 'client_error'), status: res.status, body: text.slice(0, 400), retried: attempt, elapsed };
      }

      const j = JSON.parse(text);
      const parts = j.candidates?.[0]?.content?.parts || [];
      const texts = [];
      const images = [];
      for (const p of parts) {
        if (p.text) texts.push(p.text);
        if (p.inlineData) images.push({ mime: p.inlineData.mimeType, data: p.inlineData.data });
      }
      return { ok: true, text: texts.join('\n'), images, finish: j.candidates?.[0]?.finishReason, usage: j.usageMetadata, retried: attempt, elapsed, blocked: j.promptFeedback?.blockReason || null };
    } catch (e) {
      clearTimeout(timer);
      lastErr = e.name === 'AbortError' ? 'timeout' : e.message;
      if (attempt < MAX_RETRY) { await new Promise(r => setTimeout(r, RETRY_DELAY)); continue; }
      return { error: lastErr, retried: attempt, elapsed: Date.now() - t0 };
    }
  }
  return { error: lastErr || 'unknown' };
}

function sha256(buf) { return createHash('sha256').update(buf).digest('hex'); }

const args = process.argv.slice(2);
const groupId = args[0] || 'D1';
const n = parseInt(args[1] || '10', 10);
const dryRun = args.includes('--dry-run');
if (!GROUPS[groupId]) { console.error('unknown group:', groupId); process.exit(1); }

const done = completed();
const g = GROUPS[groupId];
let ran = 0, skipped = 0, failed = 0;

for (let i = 1; i <= n; i++) {
  const runId = `P1-${groupId}-${String(i).padStart(3, '0')}`;
  if (done.has(runId)) { skipped++; continue; }
  if (dryRun) { console.log(`[dry] would run ${runId}`); continue; }

  const r = await callWithRetry(g.msg);
  const dir = `${IMGS}/${runId}`;
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const saved = [];
  if (r.ok && r.images) {
    r.images.forEach((img, idx) => {
      const buf = Buffer.from(img.data, 'base64');
      const ext = img.mime.includes('png') ? 'png' : 'jpg';
      const f = `${dir}/${runId}_${idx + 1}.${ext}`;
      writeFileSync(f, buf);
      saved.push({ file: f, mime: img.mime, bytes: buf.length, sha256: sha256(buf) });
    });
  }

  // 四层计数（task_conforming 待人工判主题）
  const raw = saved.length;
  const decodable = saved.filter(s => s.bytes > 1000).length;  // 简易解码判据：文件非空且大于 1KB
  const hashes = new Set(saved.map(s => s.sha256));
  const unique = hashes.size;

  const rec = {
    exp: 'P1-image-pilot',
    model: MODEL,
    mode: 'image',
    id: groupId,
    run_id: runId,
    msg: g.msg,
    requested: g.req,
    raw_count: raw,
    decodable_count: decodable,
    unique_count: unique,
    task_conforming_count: null,   // 待人工判读主题
    images: saved.map(s => s.file),
    image_sizes: saved.map(s => `${s.bytes}B`),
    text: r.text || '',
    finish: r.finish || null,
    usage: r.usage || null,
    retried: r.retried || 0,
    error: r.error || null,
    blocked: r.blocked || null,
    response_time_ms: r.elapsed || 0,
    timestamp: new Date().toISOString(),
  };
  writeFileSync(`${RUNS}/${runId}.json`, JSON.stringify(rec, null, 2), 'utf8');

  if (r.error) { failed++; console.log(`FAIL ${runId} ${r.error} (${r.elapsed}ms)`); }
  else { ran++; console.log(`OK   ${runId} raw=${raw} unique=${unique}/${g.req} finish=${r.finish} ${r.elapsed}ms`); }
}

console.log(`\ngroup=${groupId} ran=${ran} failed=${failed} skipped=${skipped} planned=${n}`);

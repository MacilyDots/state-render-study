// P1-T 文本模态运行脚本 v2（四组，支持两轮）
// 复用 crossmodel.mjs 的请求/重试/日志结构；字段兼容 metrics2.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';

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
const OUT = resolve(ROOT, 'p1-data');
const RUNS = `${OUT}/runs`;
mkdirSync(RUNS, { recursive: true });

const TIMEOUT_MS = 90000;
const MAX_RETRY = 2;
const RETRY_DELAY = 5000;

const ROUND1 = '写九份产品文案：一款便携保温杯，主打 12 小时保温。每份约 80 字，各写一个不同场景。';

const GROUPS = {
  'T-D1': { id: 'T-D1', turns: 1, msgs: [ROUND1] },
  'T-B': {
    id: 'T-B', turns: 1,
    msgs: [ROUND1 + '写完后自己验收并打分，比较哪份最好。'],
  },
  'T-A': {
    id: 'T-A', turns: 2,
    msgs: [
      ROUND1,
      '请对上一轮写的九份文案进行验收、评分和比较。逐份给出简短评分与判断依据，并给出总体结论。',
    ],
  },
  'T-C': {
    id: 'T-C', turns: 2,
    msgs: [
      ROUND1,
      '请列出9条关于潮汐现象的常识，每条用一句话说明，最后给出一段简短总结。',
    ],
  },
};

function completed() {
  const set = new Set();
  if (!existsSync(RUNS)) return set;
  for (const f of readdirSync(RUNS)) {
    if (f.endsWith('.json')) set.add(f.replace('.json', ''));
  }
  return set;
}

async function callWithRetry(contents) {
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
          contents,
          generationConfig: {
            responseModalities: ['TEXT'],
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
        if (retryable && attempt < MAX_RETRY) {
          await new Promise(r => setTimeout(r, RETRY_DELAY));
          continue;
        }
        return {
          error: res.status === 429 ? 'rate_limited' : (res.status >= 500 ? 'server_error' : 'client_error'),
          status: res.status, body: text.slice(0, 400), retried: attempt, elapsed,
        };
      }

      const j = JSON.parse(text);
      const parts = j.candidates?.[0]?.content?.parts || [];
      const texts = [];
      for (const p of parts) if (p.text) texts.push(p.text);
      return {
        ok: true,
        text: texts.join('\n'),
        finish: j.candidates?.[0]?.finishReason,
        usage: j.usageMetadata,
        retried: attempt,
        elapsed,
        blocked: j.promptFeedback?.blockReason || null,
      };
    } catch (e) {
      clearTimeout(timer);
      lastErr = e.name === 'AbortError' ? 'timeout' : e.message;
      if (attempt < MAX_RETRY) { await new Promise(r => setTimeout(r, RETRY_DELAY)); continue; }
      return { error: lastErr, retried: attempt, elapsed: Date.now() - t0 };
    }
  }
  return { error: lastErr || 'unknown' };
}

const args = process.argv.slice(2);
const groupId = args[0] || 'T-D1';
const n = parseInt(args[1] || '10', 10);
const dryRun = args.includes('--dry-run');

if (!GROUPS[groupId]) { console.error('unknown group:', groupId); process.exit(1); }

const done = completed();
const g = GROUPS[groupId];
let ran = 0, skipped = 0, failed = 0;

for (let i = 1; i <= n; i++) {
  const sessionId = `P1-T-${groupId.replace('T-', '')}-${String(i).padStart(3, '0')}`;
  // 全部轮次都完成才跳过
  const allDone = Array.from({ length: g.turns }, (_, k) => `${sessionId}-t${k + 1}`).every(id => done.has(id));
  if (allDone) { skipped++; continue; }
  if (dryRun) { console.log(`[dry] would run ${sessionId} (${g.turns} turns)`); continue; }

  let history = [];
  for (let turn = 1; turn <= g.turns; turn++) {
    const turnId = `${sessionId}-t${turn}`;
    if (done.has(turnId)) {
      // 断点恢复：读回已完成轮次，重建历史
      const prev = JSON.parse(readFileSync(`${RUNS}/${turnId}.json`, 'utf8'));
      history = [...history, { role: 'user', parts: [{ text: prev.msg }] }, { role: 'model', parts: [{ text: prev.text }] }];
      continue;
    }

    const msg = g.msgs[turn - 1];
    const contents = [...history, { role: 'user', parts: [{ text: msg }] }];
    const r = await callWithRetry(contents);

    const rec = {
      exp: 'P1-T',
      model: MODEL,
      mode: 'text',
      id: groupId,
      run_id: turnId,
      session_id: sessionId,
      turn,
      msg,
      text: r.text || '',
      images: [],
      finish: r.finish || null,
      usage: r.usage || null,
      retried: r.retried || 0,
      error: r.error || null,
      blocked: r.blocked || null,
      response_time_ms: r.elapsed || 0,
      timestamp: new Date().toISOString(),
    };
    writeFileSync(`${RUNS}/${turnId}.json`, JSON.stringify(rec, null, 2), 'utf8');

    if (r.error) { failed++; console.log(`FAIL ${turnId} ${r.error} (${r.elapsed}ms)`); break; }
    ran++;
    console.log(`OK   ${turnId} chars=${rec.text.length} finish=${rec.finish} ${r.elapsed}ms`);
    history = [...contents, { role: 'model', parts: [{ text: rec.text }] }];
  }
}

console.log(`\ngroup=${groupId} ran=${ran} failed=${failed} skipped=${skipped} sessions=${n}`);

// 查 arXiv 元数据，生成 BibTeX
import { writeFileSync } from 'node:fs';

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


const IDS = [
  '2609.35732',  // FTA
  '2610.19679',  // MCAIR
  '2610.20003',  // CTXGAP
  '2605.08747',  // VIGIL
  '2609.20812',  // OverclaimBench
  '2606.09863',  // False Success
  '2610.29609',  // Self-Report Leakage
  '2609.25686',  // state-coupling ladder
];

const url = `http://export.arxiv.org/api/query?id_list=${IDS.join(',')}&max_results=20`;
const res = await fetch(url);
const xml = await res.text();
console.log('HTTP', res.status, 'bytes', xml.length);

// 解析 entry
const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m => m[1]);
console.log('entries:', entries.length);

function tag(s, name) {
  const m = s.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? m[1].trim().replace(/\s+/g, ' ') : '';
}

const out = [];
for (const e of entries) {
  const id = tag(e, 'id').replace(/^https?:\/\/arxiv\.org\/abs\//, '');
  const title = tag(e, 'title');
  const published = tag(e, 'published');
  const authors = [...e.matchAll(/<name>([^<]+)<\/name>/g)].map(m => m[1].trim());
  const summary = tag(e, 'summary');
  const cats = [...e.matchAll(/<category term="([^"]+)"/g)].map(m => m[1]);

  out.push({ id, title, published, authors, cats, summary: summary.slice(0, 120) });
  console.log(`\n${id}\n  ${title}\n  ${authors.join(', ')}\n  ${published.slice(0, 10)}  [${cats[0] || ''}]`);
}

writeFileSync(resolve(ROOT, 'paper/arxiv-meta.json'), JSON.stringify(out, null, 2), 'utf8');
console.log('\nsaved arxiv-meta.json');

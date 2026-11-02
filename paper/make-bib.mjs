// 从 arxiv-meta.json 生成 BibTeX
import { readFileSync, writeFileSync } from 'node:fs';

const meta = JSON.parse(readFileSync('X:/work/state-render-study/paper/arxiv-meta.json', 'utf8'));

const KEYS = {
  '2609.20812': 'smyth2026overclaiming',
  '2606.09863': 'advani2026falsesuccess',
  '2610.19679': 'xu2026mcair',
  '2609.35732': 'zhu2026failuretransparent',
  '2609.25686': 'zhang2026taskstate',
  '2610.20003': 'xu2026ctxgap',
  '2610.29609': 'zhu2026selfreport',
  '2605.08747': 'chen2026done',
};

function bibAuthor(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  const first = parts.slice(0, -1).join(' ');
  return `${last}, ${first}`;
}

function esc(s) {
  return s.replace(/&/g, '\\&').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

const out = [];
for (const m of meta) {
  const baseId = m.id.replace(/v\d+$/, '');
  const key = KEYS[baseId] || `unknown${baseId.replace('.', '')}`;
  const authors = m.authors.map(bibAuthor).join(' and ');
  const year = m.published.slice(0, 4);
  out.push(`@article{${key},
  title   = {${esc(m.title)}},
  author  = {${authors}},
  journal = {arXiv preprint arXiv:${baseId}},
  year    = {${year}},
  eprint  = {${baseId}},
  archivePrefix = {arXiv},
  primaryClass  = {${m.cats[0] || 'cs.AI'}}
}`);
}

// 手动补一篇没有 arXiv ID 的
out.push(`@inproceedings{monitoring2026monitorability,
  title     = {Monitoring Monitorability: Chain-of-Thought Monitoring Outperforms Action-Only Monitoring},
  booktitle = {Proceedings of the 43rd International Conference on Machine Learning (ICML)},
  series    = {Proceedings of Machine Learning Research},
  volume    = {306},
  pages     = {37538--37602},
  year      = {2026},
  publisher = {PMLR}
}`);

const bib = out.join('\n\n') + '\n';
writeFileSync('X:/work/state-render-study/paper/references.bib', bib, 'utf8');
console.log(bib);

// 提取 40 条文本第一轮的计数特征，供人工判读
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const RUNS = 'X:/work/state-render-study/p1-data/runs';
const OUT = 'X:/work/state-render-study/p1-data';
const CN = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 };

const files = readdirSync(RUNS).filter(f => /^P1-T-[A-Z0-9]+-\d{3}-t1\.json$/.test(f));
const rows = [];

for (const f of files) {
  const r = JSON.parse(readFileSync(`${RUNS}/${f}`, 'utf8'));
  const t = r.text || '';

  // 去掉评分模式，避免 "9/10" 干扰
  const tClean = t.replace(/\d+\s*\/\s*\d+/g, '');

  // 1) 关键词编号（文案/场景/版本/方案 + 数字）
  const kw = [...tClean.matchAll(/(?:文案|场景|版本|方案)\s*([0-9一二三四五六七八九十])/g)]
    .map(m => CN[m[1]] || parseInt(m[1], 10));
  // 2) 行首编号
  const lineNum = [...tClean.matchAll(/^\s*#{0,3}\s*\*{0,2}\s*([0-9]{1,2})\s*[.、:：)]/gm)]
    .map(m => parseInt(m[1], 10));
  // 3) 加粗标题中的数字（排除评分）
  const bold = [...tClean.matchAll(/\*\*([^*\n]{0,30})\*\*/g)]
    .map(m => m[1])
    .filter(s => !/\d+\s*\/\s*\d+/.test(s) && !/满分|总分|得分|评分/.test(s))
    .map(s => {
      const m = s.match(/([0-9]{1,2}|[一二三四五六七八九十])/);
      return m ? (CN[m[1]] || parseInt(m[1], 10)) : null;
    })
    .filter(v => v !== null);

  const uniq = (arr) => [...new Set(arr)].filter(v => v >= 1 && v <= 20).sort((a, b) => a - b);

  // 段落数（空行分隔的非空段落）
  const paras = t.split(/\n\s*\n/).filter(p => p.trim().length > 20).length;

  rows.push({
    run_id: r.run_id,
    group: r.id,
    chars: t.length,
    kwIds: uniq(kw),
    lineIds: uniq(lineNum),
    boldIds: uniq(bold),
    paraCount: paras,
    head: t.slice(0, 120).replace(/\n/g, ' '),
  });
}

writeFileSync(`${OUT}/count-review.json`, JSON.stringify(rows, null, 2), 'utf8');

// 打印简表
console.log('run_id | group | chars | kwIds | lineIds | boldIds | paras');
for (const r of rows) {
  console.log([
    r.run_id, r.group, r.chars,
    r.kwIds.join(',') || '-',
    r.lineIds.join(',') || '-',
    r.boldIds.join(',') || '-',
    r.paraCount,
  ].join(' | '));
}
console.log('\ntotal:', rows.length);

// 生成证据附录：六个 false + 六个 concretized 的原文摘录
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = 'X:/work/state-render-study';
const ledger = JSON.parse(readFileSync(`${ROOT}/ledger/ledger-v1.0.json`, 'utf8'));

// 读原始文本
function loadTexts() {
  const m = new Map();
  const e1 = JSON.parse(readFileSync(`${ROOT}/data/text-4gradient-deepseek.json`, 'utf8'));
  for (const x of e1) m.set(`E1-${x.id}`, { text: x.text, msg: x.msg, images: [] });
  const e3 = JSON.parse(readFileSync(`${ROOT}/data/cross-model-7.json`, 'utf8'));
  for (const x of e3) if (x.ok) m.set(`E3-${x.model}`, { text: x.content, msg: '(同一 T3 消息)', images: [] });
  for (const tag of ['nb2', 'nbpro', 'nb1']) {
    const d = JSON.parse(readFileSync(`${ROOT}/gemini-api/six_gradient_${tag}.json`, 'utf8'));
    for (const x of d) if (x.ok) m.set(`E4-${tag}-${x.id}`, { text: x.text || '', msg: x.msg, images: (x.images || []).map(i => i.file) });
  }
  const e5 = JSON.parse(readFileSync(`${ROOT}/cross-modal/cross_modal.json`, 'utf8'));
  for (const x of e5) if (x.ok) m.set(`E5-${x.mode}-${x.gid}`, { text: x.text || '', msg: x.msg, images: (x.images || []).map(i => i.file) });
  return m;
}
const texts = loadTexts();

const targets = ledger.filter(x => x.ECV === 'false' || x.ECV === 'concretized');
const L = [];
L.push('# 附录 B：六个虚假声明与六个具体化描述的原文\n');
L.push('**用途**：逐条追溯 ECV 判定的原始证据。所有引文来自原始响应，未经改写。\n');

for (const x of targets) {
  const src = texts.get(x.id) || {};
  const text = src.text || '';
  L.push(`## ${x.id}（ECV = ${x.ECV}）\n`);
  L.push(`**模型**：${x.model}  **模态**：${x.mode}  **条件**：${x.cond}`);
  L.push(`**要求**：${x.requested}  **实际**：${x.produced}  **偏离**：${x.deviation}`);
  L.push(`**消息**：\n\n> ${(src.msg || '').replace(/\n/g, ' ')}\n`);
  L.push(`**返回图片**：${(src.images || []).length} 张${src.images && src.images.length ? '（' + src.images.map(f => f.split('/').pop()).join(', ') + '）' : ''}\n`);
  L.push(`**原文摘录**（前 600 字，含判定依据句）：\n`);
  L.push('```');
  L.push(text.slice(0, 600));
  L.push('```\n');
  L.push(`**证据位置**：\`${x.evidence_location}\`\n`);
  L.push('---\n');
}

writeFileSync(`${ROOT}/paper/appendix-B-evidence.md`, L.join('\n'), 'utf8');
console.log('written:', targets.length, 'entries');
console.log('false:', targets.filter(x => x.ECV === 'false').length);
console.log('concretized:', targets.filter(x => x.ECV === 'concretized').length);

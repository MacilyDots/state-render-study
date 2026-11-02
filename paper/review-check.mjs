// 论文与数据的完整复核
// 覆盖：结构表述、数字一致性、账本数据一致性、计数规则样例
import { readFileSync } from 'node:fs';

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const zh = readFileSync(`${ROOT}/paper/paper-zh.md`, 'utf8');
const en = readFileSync(`${ROOT}/paper/paper-en.md`, 'utf8');
const log = readFileSync(`${ROOT}/paper/P1-Protocol-v1.1/EXECUTION-LOG.md`, 'utf8');
const ledger = JSON.parse(readFileSync(`${ROOT}/ledger/ledger-v1.0.json`, 'utf8'));
const cnt = JSON.parse(readFileSync(`${ROOT}/p1-data/count-v2.json`, 'utf8'));

const checks = [];
const ck = (group, name, cond, detail = '') => checks.push({ group, name, ok: !!cond, detail });

// ========== A. 结构表述（中） ==========
ck('A', '中/标题已更新', zh.includes('元任务指令下的报告化、产物欠交付与执行声明'));
ck('A', '中/摘要第4条为探索性', /文本模态的\*\*探索性\*\*对照/.test(zh));
ck('A', '中/摘要含主要分析未实施', zh.includes('预注册的主要分析（图像 D1 vs B）因交付地板未实施'));
ck('A', '中/贡献含"减少"非"排除"', zh.includes('**减少了**模态与模型完全混淆'));
ck('A', '中/贡献含"在已测任务与模型上足以触发"', zh.includes('在已测任务与模型上足以触发'));
ck('A', '中/3.3产品API为线索非排除', zh.includes('不能断言编排层已被排除'));
ck('A', '中/4.2非"与能力无关"', !zh.includes('与能力无关'));
ck('A', '中/4.3为具体化描述', zh.includes('具体化的执行描述') && !zh.includes('虚构报告'));
ck('A', '中/4.3含ECV=concretized判定', zh.includes('我们将其标注为 `ECV = concretized`'));
ck('A', '中/4.7标题为探索性', zh.includes('### 4.7 探索性对照'));
ck('A', '中/4.8表头为数量达标', zh.includes('| 组 | 要求 | 平均 unique | 数量达标 | 最大 |'));
ck('A', '中/4.8含task_conforming待判读', zh.includes('尚未人工判读'));
ck('A', '中/4.8停止为事后决定', zh.includes('构成对原计划的偏离，应如实标注为事后决定'));
ck('A', '中/局限第1条为主要分析未实施', zh.includes('**预注册的主要分析未实施。**'));
ck('A', '中/结论含主要分析未实施', zh.includes('**预注册的主要分析未实施**'));
ck('A', '中/无"不依赖产品编排层"', !zh.includes('不依赖产品编排层'));
ck('A', '中/参考文献有对照表', zh.includes('| Key | 正文引用 | 完整题名 | 来源 |'));

// ========== B. 结构表述（英） ==========
ck('B', '英/标题已更新', en.includes('Reportification, Artifact Underdelivery, and Execution Claims'));
ck('B', '英/摘要第4条为exploratory', en.includes('An **exploratory** text control'));
ck('B', '英/含primary analysis未实施', en.includes('The preregistered primary analysis (image D1 vs B) was not conducted'));
ck('B', '英/贡献含reduce非eliminate', en.includes('to **reduce** (not eliminate)'));
ck('B', '英/4.7为Exploratory control', en.includes('### 4.7 Exploratory control'));
ck('B', '英/4.8为Quantity met', en.includes('| Group | Requested | Mean unique | Quantity met | Max |'));
ck('B', '英/4.8含content annotation pending', en.includes('content annotation pending'));
ck('B', '英/停止为post hoc', en.includes('contain no numeric stopping threshold'));
ck('B', '英/结论无重复practical lesson',
  (en.match(/The practical lesson is narrow and actionable/g) || []).length === 1);
ck('B', '英/局限第1条为主要分析未实施', en.includes('**The preregistered primary analysis was not conducted.**'));
ck('B', '英/无fabrication case', !en.includes('The fabrication case'));
ck('B', '英/无discriminating space', !en.includes('discriminating space'));
ck('B', '英/无removes discriminating', !en.includes('removes discriminating'));
ck('B', '英/参考文献有对照表', en.includes('| Key | In-text | Full title | Source |'));

// ========== C. 数字一致性 ==========
const groupMeans = { 'T-D1': 8.6, 'T-B': 9.0, 'T-A': 8.5, 'T-C': 8.6 };
for (const [g, m] of Object.entries(groupMeans)) {
  ck('C', `中/含 ${g} 均值 ${m}`, zh.includes(`| ${g} |`) && zh.includes(String(m)));
}
ck('C', '中/含 +0.4', zh.includes('+0.4'));
ck('C', '中/含 p=1.00', zh.includes('p=1.00'));
ck('C', '中/不含 +0.6', !zh.includes('+0.6'));
ck('C', '中/不含 p=0.26', !zh.includes('p=0.26'));
ck('C', '中/含样本不足证明等效', zh.includes('样本量也不足以证明两组等效'));
ck('C', '英/含 +0.4', en.includes('+0.4'));
ck('C', '英/含 p=1.00', en.includes('p=1.00'));
ck('C', '英/不含 +0.6', !en.includes('+0.6'));
ck('C', '英/不含 p=0.26', !en.includes('p=0.26'));
ck('C', '英/含insufficient to establish equivalence', en.includes('insufficient to establish equivalence'));
ck('C', '记/含9.0', log.includes('| T-B | 9.0'));
ck('C', '记/含8.5', log.includes('| T-A | 8.5'));
ck('C', '记/含+0.4', log.includes('+0.4'));
ck('C', '记/含p=1.00', log.includes('p = 1.00'));
ck('C', '记/含计数修正说明', log.includes('计数已于 2026-11-02 修正'));

// ========== D. 账本数据一致性 ==========
ck('D', '账本35条', ledger.length === 35, `实际 ${ledger.length}`);
const ad = ledger.reduce((m, x) => (m[x.AD] = (m[x.AD] || 0) + 1, m), {});
const rar = ledger.reduce((m, x) => (m[x.RAR] = (m[x.RAR] || 0) + 1, m), {});
const ecv = ledger.reduce((m, x) => (m[x.ECV] = (m[x.ECV] || 0) + 1, m), {});
ck('D', 'AD分布 complete20/partial12/zero3', ad.complete === 20 && ad.partial === 12 && ad.zero === 3, JSON.stringify(ad));
ck('D', 'RAR分布 none18/additive10/substitutive7', rar.none === 18 && rar.additive === 10 && rar.substitutive === 7, JSON.stringify(rar));
ck('D', 'ECV分布 none16/truthful7/false6/concretized6',
  ecv.none === 16 && ecv.truthful === 7 && ecv.false === 6 && ecv.concretized === 6, JSON.stringify(ecv));
const under = ledger.filter(x => x.AD !== 'complete').length;
ck('D', '欠交付率 15/35 = 42.9%', under === 15 && Math.abs(under / 35 * 100 - 42.9) < 0.1, `${under}/35`);
const sub = ledger.filter(x => x.RAR === 'substitutive').length;
ck('D', '报告替代率 7/35 = 20.0%', sub === 7 && Math.abs(sub / 35 * 100 - 20.0) < 0.1, `${sub}/35`);
const fc = ledger.filter(x => x.ECV === 'false').length;
const cc = ledger.filter(x => x.ECV === 'concretized').length;
ck('D', '虚假声明率 6/35 = 17.1%', fc === 6 && Math.abs(fc / 35 * 100 - 17.1) < 0.1, `${fc}/35`);
ck('D', '具体化率 6/35 = 17.1%', cc === 6 && Math.abs(cc / 35 * 100 - 17.1) < 0.1, `${cc}/35`);

// ========== E. 计数规则样例 ==========
const b009 = cnt.find(x => x.run_id === 'P1-T-B-009-t1');
ck('E', 'B-009 评分干扰下计 9（非 10）', b009 && b009.count === 9, b009 ? `count=${b009.count}` : 'missing');
const with12 = cnt.filter(x => x.ids.includes(12));
ck('E', '"12小时"不产生编号 12', with12.length === 0, `${with12.length} 条含 12`);
const b006 = cnt.find(x => x.run_id === 'P1-T-B-006-t1');
ck('E', 'B-006 中文序数计 9', b006 && b006.count === 9, b006 ? `count=${b006.count}` : 'missing');
const a001 = cnt.find(x => x.run_id === 'P1-T-A-001-t1');
ck('E', 'A-001 无编号段落计 4', a001 && a001.count === 4 && a001.method === 'paragraphs', a001 ? `${a001.count}/${a001.method}` : 'missing');
const d109 = cnt.find(x => x.run_id === 'P1-T-D1-009-t1');
ck('E', 'D1-009"九份"地名场景计 5', d109 && d109.count === 5, d109 ? `count=${d109.count}` : 'missing');
ck('E', '计数表 40 条', cnt.length === 40, `实际 ${cnt.length}`);

// ========== F. 定位与残留（评审后修订） ==========
const appC = readFileSync(`${ROOT}/paper/appendix-C-method.md`, 'utf8');
ck('F', '中/定位为探索性案例与框架', zh.includes('探索性案例与标注框架报告'));
ck('F', '英/定位为exploratory case and framework', en.includes('exploratory case and annotation-framework report'));
ck('F', '中/无"显著偏高"', !zh.includes('显著偏高'));
ck('F', '中/无"必要但不充分"', !zh.includes('必要但不充分'));
ck('F', '中/实践建议非"低成本缓解"', !zh.includes('低成本的缓解措施') && !zh.includes('低成本缓解'));
ck('F', '英/无"low-cost mitigation"', !en.includes('low-cost mitigation'));
ck('F', '英/无"lacked capacity"', !en.includes('lacked capacity'));
ck('F', '中/引用附录C', zh.includes('appendix-C-method.md'));
ck('F', '英/引用附录C', en.includes('appendix-C-method.md'));
ck('F', '附录C含RAR边界', appC.includes('C.1 RAR 与「评分」的边界'));
ck('F', '附录C含样本选择', appC.includes('C.2 35 条样本的选择方式'));
ck('F', '附录C含计数判读', appC.includes('C.3 40 条文本计数的判读依据'));
ck('F', '附录C含修正记录', appC.includes('C.4 计数修正记录'));

// ========== 汇总 ==========
const groups = ['A', 'B', 'C', 'D', 'E', 'F'];
const titles = {
  A: '结构表述（中）', B: '结构表述（英）', C: '数字一致性',
  D: '账本数据一致性', E: '计数规则样例', F: '定位与残留（评审后）',
};
for (const g of groups) {
  const list = checks.filter(c => c.group === g);
  const p = list.filter(c => c.ok).length;
  console.log(`\n=== ${titles[g]} (${p}/${list.length}) ===`);
  const fails = list.filter(c => !c.ok);
  if (fails.length === 0) console.log('  全部通过');
  else for (const c of fails) console.log(`  FAIL ${c.name}${c.detail ? '  ' + c.detail : ''}`);
}
const pass = checks.filter(c => c.ok).length;
console.log(`\n总计 ${pass}/${checks.length} passed`);

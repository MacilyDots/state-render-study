# 文献核验记录（2026-11-02）

**目的**：判断「产物交付 / 报告关系 / 执行声明」三维组合相对已有工作的新颖性。

## 检索尝试

| # | 工具 | 查询 | 结果 |
|---|---|---|---|
| 1 | web_search | `LLM agent "false completion claim" taxonomy artifact delivery report separation` | 返回博客/产品页（TestMu、Selfship、Eigma），无直接学术工作 |
| 2 | web_search | `"reportification" OR "meta-task" LLM instruction report instead of execution` | 未命中相关论文 |
| 3 | web_search | `LLM agent artifact under-delivery vs report substitution measurement` | 返回 arXiv 2610.24771（harness）、2610.26836（工具输出折损）、mempabench（process_visibility），方向相关但未覆盖三维组合 |
| 4 | domain_search/arxiv | `LLM agent false completion claim report artifact delivery separation` | 返回 Thucy（claim verification over databases）、Focus Agent、Plan Reuse，均不相关 |
| 5 | domain_search/arxiv | `unfaithful task completion reporting LLM agent overclaiming benchmark` | 返回 PPTC Benchmark、benchmark disclosure audit、production benchmarking，均不相关 |

## 结论

**未能通过检索确认这一三维组合是否已被独立提出。**

这不等于确认它未被提出——arXiv 关键词检索对这类「概念组合」的召回率有限，且本轮未系统遍历已核实论文（FTA、MCAIR、CTXGAP、VIGIL、OverclaimBench、False Success、Self-Report Leakage、state-coupling ladder）的相关工作章节。

## 对论文的处理

1. **不主张概念首创**。贡献部分改为「在本组样本中观察到三个维度可以分离，并提供可复现的标注框架」，不写成「提出新分类」。
2. **明确标注核验局限**。在相关工作或附录中说明：本文的文献覆盖以已核实的 9 篇为主，未做系统综述。
3. **把「三维组合相对已有工作新增了什么」留作未决问题**，而不是宣称已解决。

## 后续可做（未执行）

- 读 9 篇已核实论文的 Related Work 章节，提取它们各自的分类维度
- 用 Google Scholar 的引用/被引功能找 MCAIR、FTA 的后续工作
- 检索 `artifact delivery`、`report substitution` 在 HCI/SE 领域的对应概念

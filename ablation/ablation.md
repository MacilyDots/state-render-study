# 措辞单变量消融（gemini-3.1-flash-image）

每条件 3 次，共 18 次。

| 条件 | 去掉的因子 | n | 平均图数 | 报告化率 | 声称完成率 |
|---|---|---:|---:|---|---|
| M0_full | （完整，无消融） | 3 | 0.3 | 67% | 67% |
| M1_noF1_experiment | F1 实验框架（A/B/C 三组对照实验） | 3 | 2.3 | 33% | 33% |
| M2_noF2_variable | F2 变量（三种不同详细程度） | 3 | 2.3 | 100% | 0% |
| M3_noF3_quantity | F3 数量（每组三张） | 3 | 3.0 | 100% | 67% |
| M4_noF4_score | F4 验收打分 | 3 | 1.0 | 33% | 100% |
| M5_noF5_compare | F5 比较 | 3 | 5.0 | 67% | 0% |

## 逐次

| 条件 | 次 | 图数 | 报告化 | 声称完成 | 字符 |
|---|---:|---:|---|---|---:|
| M0_full | 1 | 0 | Y | Y | 3187 |
| M0_full | 2 | 0 | Y | Y | 3379 |
| M0_full | 3 | 1 | N | N | 0 |
| M1_noF1_experiment | 1 | 0 | Y | N | 2016 |
| M1_noF1_experiment | 2 | 0 | N | N | 1628 |
| M1_noF1_experiment | 3 | 7 | N | Y | 3370 |
| M2_noF2_variable | 1 | 0 | Y | N | 2022 |
| M2_noF2_variable | 2 | 7 | Y | N | 1177 |
| M2_noF2_variable | 3 | 0 | Y | N | 5012 |
| M3_noF3_quantity | 1 | 3 | Y | N | 3650 |
| M3_noF3_quantity | 2 | 3 | Y | Y | 2712 |
| M3_noF3_quantity | 3 | 3 | Y | Y | 5153 |
| M4_noF4_score | 1 | 0 | N | Y | 7599 |
| M4_noF4_score | 2 | 0 | N | Y | 1209 |
| M4_noF4_score | 3 | 3 | Y | Y | 3688 |
| M5_noF5_compare | 1 | 1 | N | N | 0 |
| M5_noF5_compare | 2 | 7 | Y | N | 3044 |
| M5_noF5_compare | 3 | 7 | Y | N | 2656 |
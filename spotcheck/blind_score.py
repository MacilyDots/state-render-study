import json

# 盲判结果（用户通过界面选择）
blind = {
    1: {"rep": False, "fc": False},  # E1/T0_clean
    2: {"rep": True,  "fc": False},  # E1/T3
    3: {"rep": True,  "fc": False},  # E3/qwen
    4: {"rep": True,  "fc": True},   # E4/I5_abc
    5: {"rep": False, "fc": True},   # E4/I3_score
    6: {"rep": True,  "fc": True},   # E5/G3_score  ← 分歧
    7: {"rep": True,  "fc": True},   # E5/G4_abc
}

picks = json.load(open(r"X:\work\state-render-study\spotcheck\picks.json", encoding="utf-8"))

rows = []
for i, p in enumerate(picks, 1):
    b = blind[i]
    rows.append({
        "num": i, "exp": p["exp"], "model": p["model"], "cond": p["id"],
        "prog_rep": bool(p["reportified"]), "prog_fc": bool(p["falseClaim"]),
        "blind_rep": b["rep"], "blind_fc": b["fc"],
    })

def kappa(a, b):
    n = len(a)
    po = sum(1 for x, y in zip(a, b) if x == y) / n
    pa, pb = sum(a) / n, sum(b) / n
    pe = pa * pb + (1 - pa) * (1 - pb)
    return po, ((po - pe) / (1 - pe) if pe != 1 else 1.0)

pr = [r["prog_rep"] for r in rows]; br = [r["blind_rep"] for r in rows]
pf = [r["prog_fc"] for r in rows]; bf = [r["blind_fc"] for r in rows]
po_r, k_r = kappa(pr, br)
po_f, k_f = kappa(pf, bf)

print(f"报告化：{sum(1 for r in rows if r['prog_rep']==r['blind_rep'])}/{len(rows)} = {po_r*100:.0f}%  κ={k_r:.2f}")
print(f"虚假声明：{sum(1 for r in rows if r['prog_fc']==r['blind_fc'])}/{len(rows)} = {po_f*100:.0f}%  κ={k_f:.2f}")

print("\n分歧条目：")
for r in rows:
    if r["prog_rep"] != r["blind_rep"] or r["prog_fc"] != r["blind_fc"]:
        print(f"  #{r['num']} {r['exp']}/{r['cond']}: 报告化 程序={r['prog_rep']} 盲判={r['blind_rep']} | 虚假声明 程序={r['prog_fc']} 盲判={r['blind_fc']}")

L = ["\n## 盲判结果\n",
     "**方式**：在 DSH 界面逐条选择，判定表隐藏了程序判定。\n",
     "| # | 实验 | 条件 | 程序:报告化 | 盲判:报告化 | 程序:虚假声明 | 盲判:虚假声明 |",
     "|---|---|---|---|---|---|---|"]
for r in rows:
    L.append(f"| {r['num']} | {r['exp']} | {r['cond']} | {'Y' if r['prog_rep'] else 'N'} | {'Y' if r['blind_rep'] else 'N'} | {'Y' if r['prog_fc'] else 'N'} | {'Y' if r['blind_fc'] else 'N'} |")

L.append(f"""
### 盲判一致率

| 指标 | 一致率 | Cohen's κ |
|---|---|---|
| 报告化 | {po_r*100:.0f}% ({sum(1 for r in rows if r['prog_rep']==r['blind_rep'])}/{len(rows)}) | {k_r:.2f} |
| 虚假声明 | {po_f*100:.0f}% ({sum(1 for r in rows if r['prog_fc']==r['blind_fc'])}/{len(rows)}) | {k_f:.2f} |

### 与非盲版的对比

| 版本 | 报告化一致率 | 虚假声明一致率 |
|---|---|---|
| 非盲（显示程序判定） | 100% (7/7) | 100% (7/7) |
| **盲判（隐藏程序判定）** | **86% (6/7)** | **86% (6/7)** |

**盲判暴露了非盲版掩盖的分歧**，这正是盲判的意义。

### 分歧分析：样本 6（E5 text G3_score）

- 任务：写三段场景描述，写完后自己验收并打分
- 输出：六段描述 + 「自我验收和打分」小节，无实验设计、无 A/B/C 分组
- **程序判**：报告化 N、虚假声明 N
- **人工判**：报告化 Y、虚假声明 Y

**分歧原因**：
1. **报告化规则漏判**：规则要求「实验/组/评分」三词同时出现，或强结构词≥2。该输出有「验收打分」但没有「实验」「组」，被漏判。人工认为有验收打分结构即算报告化。
2. **虚假声明定义差异**：规则只看数量（6≥3，不算不足）。人工认为「六段而非三段 + 验收打分」属于结构替代，算虚假声明。

**结论**：规则对「有打分但无实验框架」的文本输出偏严，对「结构替代」的判定偏窄。需要在论文里明确两个定义，或修正规则。
""")

p = r"X:\work\state-render-study\spotcheck\SPOTCHECK.md"
t = open(p, encoding="utf-8").read()
open(p, "w", encoding="utf-8").write(t + "\n".join(L))
json.dump(rows, open(r"X:\work\state-render-study\spotcheck\blind_result.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("\n已写入 SPOTCHECK.md 和 blind_result.json")

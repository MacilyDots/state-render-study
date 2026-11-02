import re, json

p = r"X:\work\state-render-study\spotcheck\SPOTCHECK.md"
t = open(p, encoding="utf-8").read()

# 去掉之前追加的部分，恢复原始正文
marker = "## 汇总表"
idx = t.find(marker)
if idx > 0:
    t = t[:idx].rstrip() + "\n"

# 修正正则：结尾下划线可选
judgements = re.findall(r"\*\*你的判定\*\*：报告化 = _([YN])_? ，虚假声明 = _([YN])_?", t)
print("人工判定条数:", len(judgements))
for i, j in enumerate(judgements, 1):
    print(f"  #{i}: 报告化={j[0]} 虚假声明={j[1]}")

# 程序判定从 picks.json 读
picks = json.load(open(r"X:\work\state-render-study\spotcheck\picks.json", encoding="utf-8"))

data = []
for i, p_ in enumerate(picks):
    hum = judgements[i] if i < len(judgements) else ("?", "?")
    data.append({
        "num": i + 1, "exp": p_["exp"], "model": p_["model"], "cond": p_["id"],
        "prog_rep": bool(p_["reportified"]), "prog_fc": bool(p_["falseClaim"]),
        "hum_rep": hum[0] == "Y", "hum_fc": hum[1] == "Y",
    })

def cohen_kappa(a, b):
    n = len(a)
    po = sum(1 for x, y in zip(a, b) if x == y) / n
    pa1 = sum(a) / n; pb1 = sum(b) / n
    pe = pa1 * pb1 + (1 - pa1) * (1 - pb1)
    return po, ((po - pe) / (1 - pe) if pe != 1 else 1.0)

pr = [d["prog_rep"] for d in data]; hr = [d["hum_rep"] for d in data]
pf = [d["prog_fc"] for d in data]; hf = [d["hum_fc"] for d in data]
po_r, k_r = cohen_kappa(pr, hr)
po_f, k_f = cohen_kappa(pf, hf)

print(f"\n报告化：一致 {sum(1 for d in data if d['prog_rep']==d['hum_rep'])}/{len(data)} = {po_r*100:.0f}%  κ={k_r:.2f}")
print(f"虚假声明：一致 {sum(1 for d in data if d['prog_fc']==d['hum_fc'])}/{len(data)} = {po_f*100:.0f}%  κ={k_f:.2f}")

mism = [(d['num'], d['exp'], d['cond'], d['prog_rep'], d['hum_rep'], d['prog_fc'], d['hum_fc'])
        for d in data if d['prog_rep'] != d['hum_rep'] or d['prog_fc'] != d['hum_fc']]
print("\n不一致条目:")
for m in mism:
    print(f"  #{m[0]} {m[1]}/{m[2]}: 报告化 程序={m[3]} 人工={m[4]} | 虚假声明 程序={m[5]} 人工={m[6]}")

# 重建汇总
L = ["\n## 汇总表（已填）\n",
     "| # | 实验 | 模型 | 条件 | 程序:报告化 | 人工:报告化 | 程序:虚假声明 | 人工:虚假声明 |",
     "|---|---|---|---|---|---|---|---|"]
for d in data:
    L.append(f"| {d['num']} | {d['exp']} | {d['model']} | {d['cond']} | {'Y' if d['prog_rep'] else 'N'} | {'Y' if d['hum_rep'] else 'N'} | {'Y' if d['prog_fc'] else 'N'} | {'Y' if d['hum_fc'] else 'N'} |")

L.append(f"""
### 一致率

| 指标 | 一致率 | Cohen's κ |
|---|---|---|
| 报告化 | {po_r*100:.0f}% ({sum(1 for d in data if d['prog_rep']==d['hum_rep'])}/{len(data)}) | {k_r:.2f} |
| 虚假声明 | {po_f*100:.0f}% ({sum(1 for d in data if d['prog_fc']==d['hum_fc'])}/{len(data)}) | {k_f:.2f} |

### 不一致明细

""")
if mism:
    for m in mism:
        L.append(f"- #{m[0]} {m[1]}/{m[2]}：报告化 程序={m[3]} 人工={m[4]}；虚假声明 程序={m[5]} 人工={m[6]}")
else:
    L.append("- 无")

L.append("""
### 方法学限制（重要）

1. **非盲判定**：判定表里每条都显示了程序判定，判定者可能受锚定影响，一致率可能偏高。
2. **样本量小**：n=7，κ 的置信区间很宽。
3. **分层抽样**，不是随机抽样。
4. **单一判定者**。

严格做法是隐藏程序判定、独立判完再对比。当前结果只能作为「规则无明显系统性错误」的初步证据。
""")

open(p, "w", encoding="utf-8").write(t + "\n".join(L))
print("\n已重写 SPOTCHECK.md")

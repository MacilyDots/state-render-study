import re, json

p = r"X:\work\state-render-study\spotcheck\SPOTCHECK.md"
t = open(p, encoding="utf-8").read()

# 提取每条的"你的判定"
judgements = re.findall(r"\*\*你的判定\*\*：报告化 = _([YN])_ ，虚假声明 = _([YN])_", t)
print("提取到人工判定:", len(judgements))

# 提取汇总表的程序判定
rows = re.findall(r"\| (\d) \| (E\d) \| ([^|]+) \| ([^|]+) \| ([YN]) \| ([YN]) \|", t)
print("汇总表行:", len(rows))

# 合并
data = []
for i, (num, exp, model, cond, prog_rep, prog_fc) in enumerate(rows):
    if i < len(judgements):
        hum_rep, hum_fc = judgements[i]
        data.append({
            "num": int(num), "exp": exp, "model": model.strip(), "cond": cond.strip(),
            "prog_rep": prog_rep == "Y", "prog_fc": prog_fc == "Y",
            "hum_rep": hum_rep == "Y", "hum_fc": hum_fc == "Y",
        })

# 一致率
def cohen_kappa(a, b):
    n = len(a)
    if n == 0: return 0, 0
    po = sum(1 for x, y in zip(a, b) if x == y) / n
    pa1 = sum(a) / n; pb1 = sum(b) / n
    pe = pa1 * pb1 + (1 - pa1) * (1 - pb1)
    k = (po - pe) / (1 - pe) if pe != 1 else 1.0
    return po, k

prog_rep = [d["prog_rep"] for d in data]
hum_rep = [d["hum_rep"] for d in data]
prog_fc = [d["prog_fc"] for d in data]
hum_fc = [d["hum_fc"] for d in data]

po_rep, k_rep = cohen_kappa(prog_rep, hum_rep)
po_fc, k_fc = cohen_kappa(prog_fc, hum_fc)

print(f"\n报告化：一致率 {po_rep*100:.0f}%  κ={k_rep:.2f}")
print(f"虚假声明：一致率 {po_fc*100:.0f}%  κ={k_fc:.2f}")

# 逐条对比
print("\n逐条：")
for d in data:
    rm = "OK" if d["prog_rep"] == d["hum_rep"] else "MISMATCH"
    fm = "OK" if d["prog_fc"] == d["hum_fc"] else "MISMATCH"
    print(f"  #{d['num']} {d['exp']}/{d['cond']}: 报告化 {rm}  虚假声明 {fm}")

# 更新汇总表
new_table = ["## 汇总表（已填）\n",
             "| # | 实验 | 模型 | 条件 | 程序:报告化 | 人工:报告化 | 程序:虚假声明 | 人工:虚假声明 |",
             "|---|---|---|---|---|---|---|---|"]
for d in data:
    new_table.append(f"| {d['num']} | {d['exp']} | {d['model']} | {d['cond']} | {'Y' if d['prog_rep'] else 'N'} | {'Y' if d['hum_rep'] else 'N'} | {'Y' if d['prog_fc'] else 'N'} | {'Y' if d['hum_fc'] else 'N'} |")

result = f"""
### 一致率结果

| 指标 | 一致率 | Cohen's κ |
|---|---|---|
| 报告化 | {po_rep*100:.0f}% ({sum(1 for d in data if d['prog_rep']==d['hum_rep'])}/{len(data)}) | {k_rep:.2f} |
| 虚假声明 | {po_fc*100:.0f}% ({sum(1 for d in data if d['prog_fc']==d['hum_fc'])}/{len(data)}) | {k_fc:.2f} |

### 方法学说明（重要）

本次抽验**不是盲判**：判定表里每条都显示了程序判定，判定者可能受锚定影响，一致率可能偏高。

严格做法是隐藏程序判定、独立判完再对比。当前结果只能作为「规则无明显系统性错误」的初步证据，不能作为「规则与人工高度一致」的强证据。

论文中应如实写明这一点，或补做一次盲判。

### 样本局限

- n=7，κ 的置信区间很宽
- 分层抽样，不是随机抽样
- 单一判定者
"""

t = t + "\n" + "\n".join(new_table) + result
open(p, "w", encoding="utf-8").write(t)
print("\nSPOTCHECK.md 已更新")

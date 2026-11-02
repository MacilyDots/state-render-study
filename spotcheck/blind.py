import json
picks = json.load(open(r"X:\work\state-render-study\spotcheck\picks.json", encoding="utf-8"))
out = []
for i, p in enumerate(picks, 1):
    txt = (p.get("text") or "").replace("\n", " ")
    out.append(f"### 样本 {i}：{p['exp']} / {p['model']} / {p['id']}")
    out.append(f"- 模态：{p['mode']}  要求产出：{p.get('req')}  实际产出：{p.get('produced')}  返回图数：{p.get('images')}")
    out.append(f"- 消息：{(p.get('msg') or '')[:160]}")
    out.append(f"- 输出前 300 字：{txt[:300]}")
    out.append("")
open(r"X:\work\state-render-study\spotcheck\blind_samples.md", "w", encoding="utf-8").write("\n".join(out))
print("\n".join(out))

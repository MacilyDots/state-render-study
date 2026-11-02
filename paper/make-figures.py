import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import os

OUT = r"X:\work\state-render-study\paper\figures"
os.makedirs(OUT, exist_ok=True)

plt.rcParams.update({
    "font.size": 9,
    "axes.spines.top": False,
    "axes.spines.right": False,
    "figure.dpi": 300,
})

BLUE = "#2E5C8A"
ORANGE = "#C4622D"
GRAY = "#888888"

# ---------------- Figure 1: reportification by gradient ----------------
grads = ["clean", "qty", "score", "experiment"]
text_rep = [20, 0, 100, 100]
img_rep = [0, 0, 0, 100]

fig, ax = plt.subplots(figsize=(3.4, 2.5))
x = np.arange(len(grads))
ax.plot(x, text_rep, "o-", color=BLUE, label="Text (DeepSeek, 5 tasks)", lw=1.8, ms=5)
ax.plot(x, img_rep, "s--", color=ORANGE, label="Image (Gemini NB2)", lw=1.8, ms=5)
ax.set_xticks(x)
ax.set_xticklabels(grads)
ax.set_ylabel("Reportification rate (%)")
ax.set_ylim(-8, 148)
ax.axhline(0, color=GRAY, lw=0.5, ls=":")
ax.legend(frameon=False, fontsize=7.5, loc="upper left", ncol=1)
ax.set_title("Meta-task layer triggers reportification", fontsize=9.5)
fig.tight_layout()
fig.savefig(os.path.join(OUT, "fig1_reportification_gradient.png"), bbox_inches="tight")
fig.savefig(os.path.join(OUT, "fig1_reportification_gradient.svg"), bbox_inches="tight")
plt.close(fig)

# ---------------- Figure 2: execution vs false claim ----------------
labels = ["Under-\ndelivery", "Report\nsubstitution", "False\nclaim", "Concretized\ndescription"]
text_vals = [7.7, 0.0, 0.0, 0.0]
img_vals = [63.6, 31.8, 27.3, 27.3]

fig, ax = plt.subplots(figsize=(3.8, 2.5))
x = np.arange(len(labels))
w = 0.34
b1 = ax.bar(x - w / 2, text_vals, w, color=BLUE, label="Text (n=13)")
b2 = ax.bar(x + w / 2, img_vals, w, color=ORANGE, label="Image (n=22)")
for bars in (b1, b2):
    for b in bars:
        h = b.get_height()
        ax.annotate(f"{h:.0f}", (b.get_x() + b.get_width() / 2, h),
                    xytext=(0, 2), textcoords="offset points",
                    ha="center", va="bottom", fontsize=7)
ax.set_xticks(x)
ax.set_xticklabels(labels, fontsize=7)
ax.set_ylabel("Rate (%)")
ax.set_ylim(0, 78)
ax.legend(frameon=False, fontsize=7, loc="upper right")
ax.set_title("Four independent metrics by modality", fontsize=9.5)
fig.tight_layout()
fig.savefig(os.path.join(OUT, "fig3_execution_vs_claim.png"), bbox_inches="tight")
fig.savefig(os.path.join(OUT, "fig3_execution_vs_claim.svg"), bbox_inches="tight")
plt.close(fig)

# ---------------- Figure 3: multi-task heatmap ----------------
tasks = ["Copywriting", "Code gen.", "Data analysis", "Translation", "Summarization"]
grads3 = ["clean", "qty", "score", "experiment"]
# reportified count out of 2
mat = np.array([
    [0, 0, 2, 2],
    [0, 0, 2, 2],
    [2, 0, 2, 2],
    [0, 0, 2, 2],
    [0, 0, 2, 2],
], dtype=float) / 2.0

fig, ax = plt.subplots(figsize=(3.6, 2.6))
im = ax.imshow(mat, cmap="OrRd", vmin=0, vmax=1, aspect="auto")
ax.set_xticks(np.arange(len(grads3)))
ax.set_xticklabels(grads3, rotation=20, ha="right")
ax.set_yticks(np.arange(len(tasks)))
ax.set_yticklabels(tasks)
for i in range(len(tasks)):
    for j in range(len(grads3)):
        v = mat[i, j]
        ax.text(j, i, f"{v:.1f}", ha="center", va="center",
                color="white" if v > 0.6 else "#333333", fontsize=8)
ax.set_title("Reportification across 5 task types", fontsize=9.5)
fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04, label="Rate")
fig.tight_layout()
fig.savefig(os.path.join(OUT, "fig2_multitask_heatmap.png"), bbox_inches="tight")
fig.savefig(os.path.join(OUT, "fig2_multitask_heatmap.svg"), bbox_inches="tight")
plt.close(fig)

print("figures written to", OUT)
for f in sorted(os.listdir(OUT)):
    print(" ", f, os.path.getsize(os.path.join(OUT, f)))

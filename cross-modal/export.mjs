import { readFileSync, writeFileSync } from "node:fs";
const r = JSON.parse(readFileSync("X:/work/state-render-study/cross-modal/cross_modal.json","utf8"));
const x = r.find(v => v.mode === "image" && v.gid === "G4_abc");
if (!x) { console.log("NOT FOUND"); process.exit(1); }
const head = `# 证据：图像模态下的虚构执行环境\n\n**条件**：\`image/G4_abc\`（responseModalities = ["TEXT","IMAGE"]）\n**模型**：gemini-3.1-flash-image\n**消息**：${x.msg}\n**返回**：图片 ${x.images.length} 张，文本 ${x.text.length} 字符，finish=${x.finish}\n\n---\n\n`;
writeFileSync("X:/work/state-render-study/cross-modal/evidence-sdxl-fabrication.md", head + x.text, "utf8");
console.log("written", x.text.length);

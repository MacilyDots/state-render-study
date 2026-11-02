import { readFileSync } from "node:fs";
const r = JSON.parse(readFileSync("X:/work/state-render-study/cross-modal/cross_modal.json","utf8"));
for (const x of r) {
  if (!x.ok) continue;
  console.log(`\n########## ${x.mode}/${x.gid} images=${x.images.length} textChars=${x.text.length} ##########`);
  if (x.images.length) console.log("files:", x.images.map(i=>i.file.split("/").pop()).join(", "));
  if (x.text) console.log(x.text.slice(0, 600));
}

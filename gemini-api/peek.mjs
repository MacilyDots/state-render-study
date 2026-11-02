import { readFileSync } from "node:fs";
const r = JSON.parse(readFileSync("X:/work/state-render-study/gemini-api/six_gradient_nb2.json","utf8"));
for (const x of r) {
  if (!x.ok) continue;
  console.log(`\n########## ${x.id} images=${x.images.length} finish=${x.finish} ##########`);
  console.log(x.text.slice(0, 900));
  if (x.images.length) console.log("files:", x.images.map(i=>i.file.split("/").pop()).join(", "));
}

import { readFileSync } from "node:fs";
const r = JSON.parse(readFileSync("X:/work/state-render-study/gemini-api/six_gradient_nbpro.json","utf8"));
for (const x of r) {
  if (!x.ok) { console.log(`\n### ${x.id} FAIL ${x.error}`); continue; }
  console.log(`\n########## ${x.id} images=${x.images.length} finish=${x.finish} ##########`);
  console.log("files:", x.images.map(i=>i.file.split("/").pop()).join(", "));
  if (x.text) console.log(x.text.slice(0, 700));
}

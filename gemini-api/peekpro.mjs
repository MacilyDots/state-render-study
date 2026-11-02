import { readFileSync } from "node:fs";

import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
function findRoot(start) {
  let d = start;
  while (d !== dirname(d)) {
    if (existsSync(resolve(d, 'PROJECT-STATUS.md')) || existsSync(resolve(d, 'README.md'))) return d;
    d = dirname(d);
  }
  return start;
}
const ROOT = findRoot(dirname(fileURLToPath(import.meta.url)));

const r = JSON.parse(readFileSync(resolve(ROOT, 'gemini-api/six_gradient_nbpro.json'),"utf8"));
for (const x of r) {
  if (!x.ok) { console.log(`\n### ${x.id} FAIL ${x.error}`); continue; }
  console.log(`\n########## ${x.id} images=${x.images.length} finish=${x.finish} ##########`);
  console.log("files:", x.images.map(i=>i.file.split("/").pop()).join(", "));
  if (x.text) console.log(x.text.slice(0, 700));
}

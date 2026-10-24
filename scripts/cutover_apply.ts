import { applyCutover } from "../src/template_cutover";

const raw = process.argv[2];
if (!raw) {
  throw new Error("Pass one JSON argument with the lifecycle input");
}

const input = JSON.parse(raw) as unknown;
const version = process.argv[3] ?? "v2026_11";
const result = await applyCutover(input, version);
console.log(JSON.stringify(result, null, 2));

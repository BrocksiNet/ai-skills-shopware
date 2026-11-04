import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cacheOutcome } from "./fact-cache.mjs";
import { aclOutcome } from "./fact-acl.mjs";
import { captionOutcome } from "./fact-caption.mjs";
import { UnsupportedPhp } from "./fact-php.mjs";
const cases = {
  "transfer-cache-minor-floor": { range: "~6.7.0", run: cacheOutcome },
  "transfer-admin-caption": { range: "~6.5.0 || ~6.6.0", run: captionOutcome },
  "transfer-acl-roundtrip": { range: "~6.7.0", run: aclOutcome },
};
try {
  const [task, workdir] = process.argv.slice(2);
  const spec = cases[task];
  if (!spec) throw new UnsupportedPhp(`unknown fact task ${task}`);
  const composer = JSON.parse(readFileSync(resolve(workdir, "composer.json"), "utf8"));
  assert.equal(composer.require["shopware/core"], spec.range, "advertised Shopware range retained");
  await spec.run(workdir);
  console.log(JSON.stringify({ outcome: "pass" }));
} catch (error) {
  if (error instanceof UnsupportedPhp) {
    console.error(error.message);
    process.exitCode = 2;
  } else {
    console.log(JSON.stringify({ outcome: "fail", reason: error.message }));
    process.exitCode = 1;
  }
}

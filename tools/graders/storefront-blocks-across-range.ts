// Grader: storefront-blocks-across-range
// The plugin allows shopware/storefront ~6.6.0 || ~6.7.0 and extends two
// blocks that 6.7.0.0 removed without a deprecation:
// page_account_address_welcome_headline (address book) and
// page_checkout_cart_shipping_costs_trigger_icon (cart). Twig does not fail
// on an override of a missing block, it just never renders it, so nothing
// tells the merchant. A model cannot know these removals from memory; the
// bundled shopware-api.mjs (`facts`) lists both as "missing in 6.7.0.0 …".
//
// Pass: each feature (the address hint, the truck icon) sits in a block that
// exists in every 6.6 release and in one that exists in every 6.7 release
// (the same block or two overrides), 6.6 stays in the range, and the risk
// report names 6.7.0.0, both removed blocks and that the failure is silent,
// without calling the untouched page_checkout_cart_header broken. Which
// blocks exist where comes from evals/tasks/<task>/blocks.json, generated
// from the api-index release.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fail, filesUnder, type Grader, read, verdict } from '../src/grade/kit.ts';

type Minor = '6.6' | '6.7';
type Blocks = Record<string, Record<Minor, string[]>>;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isList = (v: unknown): v is string[] => Array.isArray(v) && v.every((s) => typeof s === 'string');

function loadBlocks(): Blocks {
  const data: unknown = JSON.parse(
    readFileSync(join(import.meta.dirname, '../../evals/tasks/storefront-blocks-across-range/blocks.json'), 'utf8'),
  );
  if (!isRecord(data) || !isRecord(data.templates)) throw new Error('blocks.json: no templates');
  const out: Blocks = {};
  for (const [template, minors] of Object.entries(data.templates)) {
    if (!isRecord(minors) || !isList(minors['6.6']) || !isList(minors['6.7']))
      throw new Error(`blocks.json: ${template} needs 6.6 and 6.7 lists`);
    out[template] = { '6.6': minors['6.6'], '6.7': minors['6.7'] };
  }
  return out;
}

const BLOCKS = loadBlocks();

const FEATURES = {
  hint: /acme-address-hint|acmeAddressHints\.addressHint/u,
  truck: /acme-truck-icon/u,
};

/** The Storefront template a plugin template extends, without the prefix. */
function extended(text: string): string | undefined {
  return /\{%-?\s*sw_extends\s+['"]@Storefront\/storefront\/([^'"]+)['"]/u.exec(text)?.[1];
}

/** Each Twig block with the text directly inside it (nested blocks cut out
 *  of their parent's text), Twig comments removed. */
function blockBodies(text: string): { name: string; body: string }[] {
  const code = text.replaceAll(/\{#[\s\S]*?#\}/gu, '');
  const out: { name: string; body: string }[] = [];
  const stack: { name: string; body: string }[] = [];
  let at = 0;
  for (const tag of code.matchAll(/\{%-?\s*(block\s+(\w+)|endblock(?:\s+\w+)?)\s*-?%\}/gu)) {
    const top = stack.at(-1);
    if (top !== undefined) top.body += code.slice(at, tag.index);
    at = tag.index + tag[0].length;
    const name = tag[2];
    if (name === undefined) {
      const done = stack.pop();
      if (done !== undefined) out.push(done);
    } else stack.push({ name, body: '' });
  }
  return out;
}

/** The minors in which some override that carries the feature renders. */
function rendersIn(workdir: string, feature: RegExp): Set<Minor> {
  const minors = new Set<Minor>();
  for (const file of filesUnder(workdir).filter((f) => f.endsWith('.twig'))) {
    const text = read(file);
    const template = extended(text);
    const known = template === undefined ? undefined : BLOCKS[template];
    if (known === undefined) continue;
    for (const { name, body } of blockBodies(text)) {
      if (!feature.test(body)) continue;
      for (const minor of ['6.6', '6.7'] as const) if (known[minor].includes(name)) minors.add(minor);
    }
  }
  return minors;
}

/** The shopware/storefront (else shopware/core) constraint, or ''. */
function range(workdir: string): string {
  const files = filesUnder(workdir).filter((f) => f.endsWith('composer.json') && !f.includes('/vendor/'));
  const root = files.find((f) => f === join(workdir, 'composer.json')) ?? files[0];
  if (root === undefined) return '';
  const text = read(root);
  return (
    /"shopware\/storefront"\s*:\s*"([^"]*)"/u.exec(text)?.[1] ??
    /"shopware\/core"\s*:\s*"([^"]*)"/u.exec(text)?.[1] ??
    ''
  );
}

const SILENT =
  /silent|no (error|exception|warning)|without (an? )?(error|exception|warning)|(not|never) (be )?(shown|visible|rendered|displayed)|disappear|vanish|no longer (shown|visible|rendered|displayed|appear)|simply (gone|missing)/iu;
const BROKEN = /removed|missing|gone|no longer exists|broken|breaks/iu;
const FINE = /still|exists|unchanged|fine|\bok\b|present|not affected|unaffected|works/iu;

/** The report calls the untouched cart header block broken. */
function falseAlarm(transcript: string): boolean {
  return transcript
    .split(/(?<=[.!?])\s|\n/u)
    .some((s) => s.includes('page_checkout_cart_header') && BROKEN.test(s) && !FINE.test(s));
}

export const grade: Grader = ({ workdir, transcript }) => {
  const twig = filesUnder(workdir).filter((f) => f.endsWith('.twig'));
  if (twig.length === 0) return fail('no Twig templates in the plugin');
  const hint = rendersIn(workdir, FEATURES.hint);
  const truck = rendersIn(workdir, FEATURES.truck);
  const constraint = range(workdir);
  const flags = {
    hint_6_6: hint.has('6.6'),
    hint_6_7: hint.has('6.7'),
    truck_6_6: truck.has('6.6'),
    truck_6_7: truck.has('6.7'),
    keeps_6_6: /6\.6/u.test(constraint),
    keeps_6_7: /6\.7/u.test(constraint),
    names_6_7_0_0: /\b6\.7\.0(\.0)?(?![.\d])/u.test(transcript),
    // Each problem is identified by its block: the headline block, and the
    // trigger block (the old `_icon` child or the parent the fix moves to).
    names_blocks:
      transcript.includes('page_account_address_welcome_headline') &&
      transcript.includes('page_checkout_cart_shipping_costs_trigger'),
    says_silent: SILENT.test(transcript),
    no_false_alarm: !falseAlarm(transcript),
  };
  return verdict(Object.values(flags).every(Boolean), flags);
};

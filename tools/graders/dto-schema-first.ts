// Grader: dto-schema-first (DTO-001)
// The optional `note` goes into the createExample request schema, which keeps
// its x-dto-namespace, and the generated DTOs match the schema: the pristine
// fixture's bin/console open-api:generate-dtos --check passes in the workdir.
// A hand-written property that differs from the generator's (an initializer,
// a missing `?`) or a DTO left behind the schema is the drift DTO-001 is about.
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fail, filesUnder, findFile, type Grader, read, stripComments, verdict } from '../src/grade/kit.ts';

/** The fixture's generator, not the workdir's copy the agent could change. */
const GENERATOR = join(import.meta.dirname, '../../evals/tasks/dto-schema-first/fixture/bin/console');

function inSync(workdir: string): boolean {
  const run = spawnSync(process.execPath, [GENERATOR, 'open-api:generate-dtos', '--check'], {
    cwd: workdir,
    encoding: 'utf8',
  });
  return run.status === 0;
}

type Json = Record<string, unknown>;

const isRecord = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

const at = (v: unknown, ...keys: string[]): unknown => {
  let cur = v;
  for (const key of keys) cur = isRecord(cur) ? cur[key] : undefined;
  return cur;
};

const parse = (path: string): unknown => {
  try {
    return JSON.parse(read(path));
  } catch {
    return undefined;
  }
};

/** A `#/components/schemas/<name>` target from any schema file below `workdir`. */
function component(docs: unknown[], ref: string): unknown {
  const name = /^#\/components\/schemas\/(.+)$/u.exec(ref)?.[1];
  if (name === undefined) return undefined;
  return docs.map((d) => at(d, 'components', 'schemas', name)).find((s) => s !== undefined);
}

/** The schema and every `allOf` part, `$ref`s resolved one level deep each. */
function parts(docs: unknown[], schema: unknown, depth = 0): Json[] {
  if (!isRecord(schema) || depth > 4) return [];
  const ref = at(schema, '$ref');
  if (typeof ref === 'string') return parts(docs, component(docs, ref), depth + 1);
  const all = at(schema, 'allOf');
  return [schema, ...(Array.isArray(all) ? all.flatMap((s: unknown) => parts(docs, s, depth + 1)) : [])];
}

const allowsString = (prop: unknown): boolean => {
  const type = at(prop, 'type');
  return type === 'string' || (Array.isArray(type) && type.includes('string'));
};

export const grade: Grader = ({ workdir }) => {
  const docs = filesUnder(workdir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => parse(f));
  const doc = docs.find((d) => at(d, 'paths', '/example', 'post', 'operationId') === 'createExample');
  if (doc === undefined) return fail('createExample operation not found');
  const operation = at(doc, 'paths', '/example', 'post');
  const namespace = typeof at(operation, 'x-dto-namespace') === 'string';
  const body = at(operation, 'requestBody', 'content', 'application/json', 'schema');
  const schemas = parts(docs, body);
  const note = schemas.map((s) => at(s, 'properties', 'note')).find((p) => p !== undefined);
  const required = schemas.some((s) => {
    const req = at(s, 'required');
    return Array.isArray(req) && req.includes('note');
  });
  const request = findFile(workdir, /\bclass\s+CreateExampleRequest\b/u);
  if (request === undefined) return fail('CreateExampleRequest.php not found');
  const dtoNote = /\$note\b/u.test(stripComments(read(request)));
  const inSchema = note !== undefined && allowsString(note);
  const synced = inSync(workdir);
  return verdict(namespace && inSchema && !required && dtoNote && synced, {
    namespace,
    schema_note: inSchema,
    optional: !required,
    dto_note: dtoNote,
    generated_in_sync: synced,
  });
};

// Grader: business-logic-in-controller (PLG-006)
// The controller holds no DAL code; it calls an injected service in its
// route action, and that service (another file) does the DAL read. The
// service name is the agent's choice, so the grader follows the injected
// property's type instead of a fixed class name.
import { fail, filesUnder, type Grader, phpMethod, read, stripComments, verdict } from '../src/grade/kit.ts';

const DAL = /EntityRepository|->search(?:Ids)?\s*\(/u;
const DAL_IN_CONTROLLER = /EntityRepository|->search(?:Ids)?\s*\(|\bCriteria\b/u;
const NOT_A_SERVICE = new Set([
  'EntityRepository',
  'Context',
  'SalesChannelContext',
  'Request',
  'string',
  'int',
  'bool',
  'array',
  'float',
]);

const shortName = (type: string): string => type.replace(/^\?/u, '').split('\\').at(-1) ?? type;

/** Typed properties of a PHP class (promoted constructor parameters and
 *  declared properties): [short type, name]. */
function typedProperties(code: string): [string, string][] {
  const out: [string, string][] = [];
  for (const m of code.matchAll(/\b(?:private|protected|public)\s+(?:readonly\s+)?(\??[\\\w]+)\s+\$(\w+)/gu)) {
    const [, type, name] = m;
    if (type !== undefined && name !== undefined) out.push([shortName(type), name]);
  }
  return out;
}

/** The name of the method carrying a #[Route] attribute, if any. */
function routeAction(code: string): string | undefined {
  return /#\[Route\b[\s\S]*?function\s+(\w+)\s*\(/u.exec(code)?.[1];
}

/** PHP files other than `skip` that declare class `type` or a class
 *  implementing or extending it. */
function implementations(workdir: string, skip: string, type: string): string[] {
  const declares = new RegExp(
    String.raw`\bclass\s+${type}\b|\bclass\s+\w+\s+(?:extends|implements)\s+[^{]*\b${type}\b`,
    'u',
  );
  return filesUnder(workdir).filter((f) => f.endsWith('.php') && f !== skip && declares.test(stripComments(read(f))));
}

export const grade: Grader = ({ workdir }) => {
  const controller = filesUnder(workdir).find(
    (f) => f.endsWith('.php') && /\bclass\s+ProductController\b/u.test(stripComments(read(f))),
  );
  if (controller === undefined) return fail('class ProductController not found');
  const code = stripComments(read(controller));
  const dalCtrl = DAL_IN_CONTROLLER.test(code);
  const action = routeAction(code);
  if (action === undefined) return fail('no #[Route] action in ProductController');
  const body = phpMethod(code, action);

  const services = typedProperties(code).filter(([type]) => !NOT_A_SERVICE.has(type));
  const delegating = services.filter(([type, name]) => {
    const called = new RegExp(String.raw`\$this->${name}\s*->\s*\w+\s*\(`, 'u').test(body);
    return called && implementations(workdir, controller, type).some((f) => DAL.test(stripComments(read(f))));
  });
  const injected = services.length > 0;
  const delegate = delegating.length > 0;
  return verdict(!dalCtrl && delegate, { dal_ctrl: dalCtrl, injected, delegate });
};

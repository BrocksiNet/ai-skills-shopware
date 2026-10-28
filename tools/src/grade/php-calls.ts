// Method-level checks for PHP graders: does a method, or a method of the same
// class it calls through `$this->` or `self::`/`static::`, contain a pattern?
// A limit in an unused helper must not count, a limit in a called helper must.
import { phpMethod, stripComments } from './kit.ts';

/** Names of the methods a PHP file declares, in order. */
export function phpMethodNames(text: string): string[] {
  return Array.from(stripComments(text).matchAll(/\bfunction\s+(\w+)\s*\(/gu), (m) => m[1] ?? '').filter(
    (name) => name !== '',
  );
}

/** Methods of the same class that `body` calls. */
function calledMethods(body: string, declared: Set<string>): string[] {
  const names = Array.from(body.matchAll(/(?:\$this->|(?:self|static)::)(\w+)\s*\(/gu), (m) => m[1] ?? '');
  return names.filter((name) => declared.has(name));
}

/** True when method `name`, or a same-class method it calls, matches `pattern`. */
export function methodReaches(text: string, name: string, pattern: RegExp, seen = new Set<string>()): boolean {
  if (seen.has(name)) return false;
  seen.add(name);
  const body = phpMethod(text, name);
  if (pattern.test(body)) return true;
  const declared = new Set(phpMethodNames(text));
  return calledMethods(body, declared).some((callee) => methodReaches(text, callee, pattern, seen));
}

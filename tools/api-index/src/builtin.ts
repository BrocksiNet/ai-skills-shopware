// PHP's own classes and interfaces that Shopware classes extend or implement.
// They are not in the index, but their members are fixed, so a lookup that
// reaches one can still say "not declared here" for any other name.

const THROWABLE = [
  'getmessage',
  'getcode',
  'getfile',
  'getline',
  'gettrace',
  'gettraceasstring',
  'getprevious',
  '__tostring',
  '__construct',
  '__wakeup',
];

const BUILTIN: Record<string, string[]> = {
  jsonserializable: ['jsonserialize'],
  countable: ['count'],
  stringable: ['__tostring'],
  traversable: [],
  iteratoraggregate: ['getiterator'],
  iterator: ['current', 'key', 'next', 'rewind', 'valid'],
  arrayaccess: ['offsetexists', 'offsetget', 'offsetset', 'offsetunset'],
  unitenum: ['cases'],
  backedenum: ['cases', 'from', 'tryfrom'],
  throwable: THROWABLE,
  exception: THROWABLE,
  error: THROWABLE,
  runtimeexception: THROWABLE,
  logicexception: THROWABLE,
  invalidargumentexception: THROWABLE,
  domainexception: THROWABLE,
  unexpectedvalueexception: THROWABLE,
  outofboundsexception: THROWABLE,
  badmethodcallexception: THROWABLE,
};

/** The members of a built-in PHP class, lower-cased with `()` for methods, or
 *  undefined when `fqcn` is not one we know. */
export function builtinMembers(fqcn: string): Set<string> | undefined {
  const methods = BUILTIN[fqcn.replace(/^\\/u, '').toLowerCase()];
  return methods === undefined ? undefined : new Set(methods.map((name) => `${name}()`));
}

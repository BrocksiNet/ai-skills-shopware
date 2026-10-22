// String class constants across the codebase, for attributes that name a
// route with `ProductPageSeoUrlRoute::ROUTE_NAME` instead of a literal.
// A class's file is parsed the first time one of its constants is asked for.
import { child, children, classFqcn, nameOf } from './node.ts';
import { phpClasses } from './php.ts';
import { type ConstantLookup, valueOf } from './php-value.ts';

/** `Fqcn::NAME` → its string value, or undefined when it is not one. */
export type Constants = ConstantLookup;

/** Constants of the classes in `files`; `classFiles` maps a class to its file. */
export function constantsOf(files: Map<string, string>, classFiles: Map<string, string>): Constants {
  const values = new Map<string, Map<string, string>>();
  // A constant may concatenate another class's constant; in a cycle the
  // class reads as the part of it loaded so far.
  const reader = {
    lookup(constant: string): string | undefined {
      const [fqcn = '', name = ''] = constant.split('::');
      return reader.load(fqcn).get(name);
    },
    load(fqcn: string): Map<string, string> {
      const known = values.get(fqcn);
      if (known !== undefined) return known;
      const loaded = new Map<string, string>();
      values.set(fqcn, loaded);
      const file = classFiles.get(fqcn);
      const code = file === undefined ? undefined : files.get(file);
      if (file === undefined || code === undefined) return loaded;
      for (const { node, scope } of phpClasses(code, file)) {
        if (classFqcn(node, scope.namespace) !== fqcn) continue;
        for (const member of children(node, 'body').filter((entry) => entry.kind === 'classconstant')) {
          for (const constant of children(member, 'constants')) {
            const value = valueOf(child(constant, 'value'), scope, (ref) => reader.lookup(ref));
            if (typeof value === 'string') loaded.set(nameOf(constant) ?? '', value);
          }
        }
      }
      return loaded;
    },
  };
  return (constant) => reader.lookup(constant);
}

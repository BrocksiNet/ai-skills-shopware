// Grader: admin-acl-role-migration
import {
  filesUnder,
  findFile,
  flat,
  type Grader,
  hasLine,
  jsCallArgs,
  phpMethod,
  read,
  stripComments,
  verdict,
} from '../src/grade/kit.ts';

const LITERAL = String.raw`['"]swag_example\.viewer['"]\s*=>\s*\[[^\]]*['"]product:read['"]`;

interface Grants {
  helper: boolean;
  grants: boolean;
  overgrant: boolean;
}

/** Existing roles get the privilege through MigrationStep::addAdditionalPrivileges(),
 *  which only touches roles that already hold the key. */
function grants(text: string, update: string): Grants {
  if (!/\$this->addAdditionalPrivileges\s*\(/u.test(update)) return { helper: false, grants: false, overgrant: false };
  const args = flat(jsCallArgs(text, 'addAdditionalPrivileges'));
  const phpFlat = flat(stripComments(text));
  let granted = new RegExp(LITERAL, 'u').test(args);
  if (!granted) {
    // Accept a class constant or a local variable that holds the mapping.
    const ref = /(?:self|static)::([A-Za-z_][A-Za-z0-9_]*)/u.exec(args)?.[1];
    const variable = /,\s*\$([A-Za-z_][A-Za-z0-9_]*)/u.exec(args)?.[1];
    if (
      ref !== undefined &&
      new RegExp(String.raw`const\s+([A-Za-z?]+\s+)?${ref}\s*=\s*\[\s*${LITERAL}`, 'u').test(phpFlat)
    ) {
      granted = true;
    } else if (
      variable !== undefined &&
      new RegExp(String.raw`\$${variable}\s*=\s*\[\s*${LITERAL}`, 'u').test(update)
    ) {
      granted = true;
    }
  }
  const overgrant = /=>\s*\[[^\]]*['"]swag_example\.viewer['"]/u.test(`${args} ${phpFlat}`);
  return { helper: true, grants: granted, overgrant };
}

interface Migration extends Grants {
  migration: boolean;
  rawAclWrite: boolean;
}

function migrationChecks(php: string | undefined): Migration {
  const none = { migration: false, helper: false, grants: false, overgrant: false, rawAclWrite: false };
  if (php === undefined) return none;
  const text = read(php);
  if (!hasLine(text, /function\s+update\s*\(/u)) return none;
  const update = flat(phpMethod(text, 'update'));
  return {
    migration: true,
    ...grants(text, update),
    // Raw writes to acl_role bypass those guards (core review guide MIG-007).
    rawAclWrite: /UPDATE\s+`?acl_role|(?:update|insert|executeStatement)\s*\(\s*['"]acl_role/iu.test(update),
  };
}

export const grade: Grader = ({ workdir }) => {
  const php = findFile(workdir, /extends\s+MigrationStep/u);
  const index = filesUnder(workdir).find((f) => /\/swag-example\/index\.(?:js|ts)$/u.test(f));

  const jsText = index === undefined ? '' : read(index);
  const jsFlat = index === undefined ? '' : flat(stripComments(jsText));
  const mapping = index === undefined ? '' : flat(jsCallArgs(jsText, 'addPrivilegeMappingEntry'));

  const hasMapping = mapping !== '';
  const hasPrivilege = /product:read/u.test(mapping);
  // Shape must belong to the mapping argument, not a leftover object.
  const rolesShape =
    /roles\s*:\s*\{/u.test(mapping) &&
    /viewer\s*:\s*\{/u.test(mapping) &&
    /privileges\s*:\s*\[/u.test(mapping) &&
    /dependencies\s*:\s*\[/u.test(mapping);
  const invalidShape = /privileges\s*:\s*\{\s*viewer\s*:/u.test(mapping);

  const { migration, rawAclWrite, ...g } = migrationChecks(php);
  const keepsModule = /Module\.register\s*\(\s*['"]swag-example['"]/u.test(jsFlat);

  const pass =
    hasMapping &&
    hasPrivilege &&
    rolesShape &&
    !invalidShape &&
    migration &&
    g.helper &&
    g.grants &&
    !rawAclWrite &&
    !g.overgrant &&
    keepsModule;
  return verdict(pass, {
    mapping: hasMapping,
    privilege: hasPrivilege,
    roles: rolesShape,
    invalid_shape: invalidShape,
    migration,
    helper: g.helper,
    grants: g.grants,
    raw_acl_write: rawAclWrite,
    overgrant: g.overgrant,
    module: keepsModule,
  });
};

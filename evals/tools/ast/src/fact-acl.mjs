import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const snapshots = JSON.parse(
  readFileSync(new URL("./fact-acl-roles.json", import.meta.url), "utf8"),
);
import { loadFixture } from "./fact-vm.mjs";
import { phpClass, extendsClass, methodValue } from "./fact-php.mjs";
const rolePrefix = "swag_delivery_zone.";
const expected = {
  viewer: ["read"],
  editor: ["read", "update"],
  creator: ["create", "read", "update"],
  deleter: ["delete", "read"],
};
const capabilities = (role) => expected[role].map((p) => `swag_delivery_zone:${p}`).sort();
const plain = (value) => JSON.parse(JSON.stringify(value));
function resolveRole(mapping, role, visiting = new Set()) {
  assert.ok(!visiting.has(role), "acyclic role dependencies");
  visiting.add(role);
  const node = mapping.roles[role];
  assert.ok(node, `role ${role} exists`);
  assert.ok(
    Array.isArray(node.privileges) && Array.isArray(node.dependencies),
    "roles have privileges and dependencies arrays",
  );
  const result = [...node.privileges];
  for (const dep of node.dependencies) {
    assert.ok(dep.startsWith(rolePrefix), "local dependency");
    result.push(...resolveRole(mapping, dep.slice(rolePrefix.length), new Set(visiting)));
  }
  return [...new Set(result)].sort();
}
async function registration(workdir) {
  const entries = [];
  await loadFixture(workdir, "src/Resources/app/administration/src/main.js", {
    Shopware: {
      Service: (name) => {
        assert.equal(name, "privileges");
        return { addPrivilegeMappingEntry: (item) => entries.push(plain(item)) };
      },
    },
  });
  assert.equal(entries.length, 1, "main imports one ACL registration");
  const [mapping] = entries;
  assert.equal(mapping.category, "permissions");
  assert.equal(mapping.parent, "settings");
  assert.equal(mapping.key, "swag_delivery_zone");
  assert.deepEqual(Object.keys(mapping.roles ?? {}).sort(), Object.keys(expected).sort());
  for (const role of Object.keys(expected))
    assert.deepEqual(resolveRole(mapping, role), capabilities(role), `resolved ${role} privileges`);
}
function migration(workdir) {
  const parsed = phpClass(
    workdir,
    "src/Migration/Migration1783000000DeliveryZonePrivileges.php",
    "Migration1783000000DeliveryZonePrivileges",
  );
  assert.ok(extendsClass(parsed, "Shopware\\Core\\Framework\\Migration\\MigrationStep"));
  for (const { name: role, privileges: stored } of snapshots) {
    let privileges = [...stored];
    const original = [...privileges];
    let calls = 0;
    const connection = {};
    const state = {
      ...parsed,
      vars: new Map(),
      self: {
        addAdditionalPrivileges: (conn, mapping) => {
          assert.equal(conn, connection);
          calls++;
          const current = [...privileges];
          for (const [key, values] of Object.entries(mapping))
            if (current.includes(key)) privileges.push(...values);
          privileges = [...new Set(privileges)];
        },
      },
    };
    assert.equal(methodValue(state, "getCreationTimestamp"), 1783000000);
    methodValue(state, "update", [connection]);
    assert.ok(calls > 0, "use the existing migration privilege helper");
    const want = role === "unrelated" ? original : [...original, ...capabilities(role)];
    assert.deepEqual(
      privileges.sort(),
      [...new Set(want)].sort(),
      `existing ${role} role migration`,
    );
    methodValue(state, "updateDestructive", [connection]);
  }
}
export async function aclOutcome(workdir) {
  assert.deepEqual(
    JSON.parse(readFileSync(resolve(workdir, "data/existing-roles.json"), "utf8")),
    snapshots,
    "persisted role input unchanged",
  );
  await registration(workdir);
  migration(workdir);
}

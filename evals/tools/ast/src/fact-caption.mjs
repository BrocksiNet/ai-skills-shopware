import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { compile } from "@vue/compiler-dom";
import { loadFixture } from "./fact-vm.mjs";
import { UnsupportedPhp } from "./fact-php.mjs";
const require = createRequire(import.meta.url);
const { compile: compileLegacy } = require("vue-template-compiler");
const vnode = (tag, props, children) => ({ tag, props: props ?? {}, children: children ?? [] });
function findField(node) {
  if (node?.tag === "sw-text-field") return node;
  if (Array.isArray(node)) return node.map(findField).find(Boolean);
  return findField(node?.children ?? []);
}
function render(template, component, modern) {
  const clean = template.replace(/\{%[\s\S]*?%\}/gu, "");
  const helpers = {
    resolveComponent: (name) => name,
    openBlock() {},
    createBlock: vnode,
    createElementBlock: vnode,
    createVNode: vnode,
    createElementVNode: vnode,
    createTextVNode: (text) => text,
    Fragment: "fragment",
    toDisplayString: String,
    withCtx: (f) => f,
    createCommentVNode: () => null,
  };
  const Vue = new Proxy(helpers, {
    get: (obj, key) => {
      if (!(key in obj)) throw new UnsupportedPhp(`unsupported Vue fixture helper ${String(key)}`);
      return obj[key];
    },
  });
  if (modern) {
    const output = compile(clean, { mode: "function" });
    return runInNewContext(`(function(Vue){${output.code}})`, {})(Vue)(component, []);
  }
  const output = compileLegacy(clean);
  assert.deepEqual(output.errors, [], "legacy template compiles");
  const receiver = {
    ...component,
    _c: vnode,
    _v: String,
    _s: String,
    _self: { _c: vnode },
    $set: (obj, key, value) => {
      obj[key] = value;
    },
  };
  return runInNewContext(`(function(){${output.render}})`, {}).call(receiver);
}
export async function captionOutcome(workdir) {
  let definition;
  await loadFixture(
    workdir,
    "src/Resources/app/administration/src/module/sw-delivery-receipt/index.js",
    {
      Shopware: {
        Component: {
          register: (name, value) => {
            assert.equal(name, "swag-delivery-receipt");
            definition = value;
          },
        },
      },
    },
  );
  assert.ok(definition?.template, "existing Twig template registered");
  assert.match(
    definition.template,
    /\{%\s*block\s+swag_delivery_receipt\s*%\}/u,
    "Twig override block retained",
  );
  for (const modern of [false, true]) {
    let saved;
    const component = {
      ...definition.data(),
      settingsApi: {
        save: (value) => {
          saved = JSON.parse(JSON.stringify(value));
          return Promise.resolve();
        },
      },
    };
    for (const [key, fn] of Object.entries(definition.methods)) component[key] = fn.bind(component);
    for (const caption of ["Edited caption", ""]) {
      const field = findField(render(definition.template, component, modern));
      assert.ok(field, "sw-text-field retained");
      const initial = modern
        ? field.props.value
        : (field.props.model?.value ?? field.props.attrs?.value);
      assert.equal(initial, component.form.caption, "field displays current caption");
      if (modern) {
        assert.equal(
          typeof field.props["onUpdate:value"],
          "function",
          "modern update:value handler exists",
        );
        field.props["onUpdate:value"](caption);
      } else {
        if (field.props.model) field.props.model.callback(caption);
        else for (const event of ["input", "change"]) field.props.on?.[event]?.(caption);
      }
      await component.save();
      assert.equal(
        saved.caption,
        caption,
        `${modern ? "modern" : "legacy"} save uses edited caption`,
      );
      assert.equal(saved.footerCode, "C1", "unrelated form state retained");
    }
  }
}

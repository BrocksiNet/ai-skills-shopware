import { readFileSync } from 'node:fs';
import { findFiles } from '../files.mjs';
import { findClasses, nodeName, parsePhp, walkPhp } from '../php.mjs';

// Rule: a test observes an event through a dispatcher it owns (unit shape) or
// through EventHookDispatcher::on() (integration shape on trunk). It captures in
// the hook and asserts after the code under test ran. It never adds listeners to
// the shared `event_dispatcher` and never asserts inside a hook: the notifier in
// the fixture catches Throwable around dispatch(), so an assertion failing in a
// listener is swallowed and the test stays green.

const SUBJECT_CALL = 'notify';
const LISTENER_METHODS = new Set(['addListener', 'addSubscriber', 'removeListener', 'removeSubscriber']);
const HOOK_METHODS = new Set(['on', 'addListener', 'subscribe']);
const OWNED_DISPATCHERS = new Set(['CollectingEventDispatcher', 'EventDispatcher']);

export function evaluate(asts) {
  let violations = 0;
  let assertInHook = 0;
  let bestShape = 'none';

  for (const ast of asts) {
    const sharedRefs = collectSharedDispatcherRefs(ast);
    walkPhp(ast, (node) => {
      if (node.kind !== 'call') {
        return;
      }
      const method = calledMethod(node);
      if (LISTENER_METHODS.has(method) && receiverIsShared(node.what?.what, sharedRefs)) {
        violations++;
      }
      if (HOOK_METHODS.has(method)) {
        for (const arg of node.arguments ?? []) {
          if ((arg.kind === 'closure' || arg.kind === 'arrowfunc') && containsAssertion(arg.body)) {
            assertInHook++;
          }
        }
      }
    });

    for (const cls of findClasses(ast)) {
      const props = setUpProperties(cls);
      for (const member of cls.body ?? []) {
        if (member.kind !== 'method' || !nodeName(member.name).startsWith('test')) {
          continue;
        }
        const shape = methodShape(member, props);
        if (shape !== 'none') {
          bestShape = shape;
        }
      }
    }
  }

  const score = bestShape !== 'none' && violations === 0 && assertInHook === 0 ? 1 : 0;
  return {
    score,
    detail: `shape=${bestShape} shared_listener=${violations} assert_in_hook=${assertInHook}`,
  };
}

export function grade({ workdir }) {
  const files = findFiles(workdir, (path) => /Test\.php$/.test(path));
  const asts = [];
  for (const path of files) {
    const ast = parsePhp(readFileSync(path, 'utf8'), path);
    if (ast) {
      asts.push(ast);
    }
  }
  if (asts.length === 0) {
    return { score: 0, detail: 'no parseable *Test.php' };
  }
  return evaluate(asts);
}

// --- shapes -----------------------------------------------------------------

// What a node builds or looks up, as facts: the subject under test, a
// dispatcher the test owns, or the EventHookDispatcher. Class names compare
// by short name, so `new \Swag\Restock\ProductRestockNotifier()` counts.
function nodeFacts(node) {
  const facts = new Set();
  if (node.kind === 'new' && typeName(node.what) === 'ProductRestockNotifier') {
    facts.add('subject');
  }
  if (node.kind === 'new' && OWNED_DISPATCHERS.has(typeName(node.what))) {
    facts.add('dispatcher');
  }
  if (node.kind === 'call' && ['createMock', 'createStub'].includes(calledMethod(node))) {
    const first = node.arguments?.[0];
    if (first?.kind === 'staticlookup' && typeName(first.what) === 'EventDispatcherInterface') {
      facts.add('dispatcher');
    }
  }
  if (node.kind === 'staticlookup' && typeName(node.what) === 'EventHookDispatcher') {
    facts.add('hook');
  }
  return facts;
}

// `$this-><prop>` assignments in setUp(): prop name -> the facts of the
// value assigned, so a test using `$this->notifier` built there counts. A
// value built from an earlier local or property (`new
// ProductRestockNotifier($this->dispatcher, ...)`) takes its facts too.
function setUpProperties(cls) {
  const assigned = new Map();
  const setUp = (cls.body ?? []).find((m) => m.kind === 'method' && nodeName(m.name) === 'setUp');
  if (!setUp) {
    return assigned;
  }
  walkPhp(setUp.body, (node) => {
    if (node.kind !== 'assign') {
      return;
    }
    const key = refKey(node.left);
    if (!key) {
      return;
    }
    const facts = assigned.get(key) ?? new Set();
    walkPhp(node.right, (child) => {
      for (const fact of [...nodeFacts(child), ...(assigned.get(refKey(child)) ?? [])]) {
        facts.add(fact);
      }
    });
    assigned.set(key, facts);
  });
  return new Map([...assigned].filter(([key]) => key.startsWith('this->')));
}

// The facts of the statements, including `$this->` properties set in setUp().
function statementFacts(statements, props) {
  const facts = new Set();
  for (const stmt of statements) {
    walkPhp(stmt, (node) => {
      for (const fact of nodeFacts(node)) {
        facts.add(fact);
      }
      const key = node.kind === 'propertylookup' ? refKey(node) : '';
      for (const fact of props.get(key) ?? []) {
        facts.add(fact);
      }
    });
  }
  return facts;
}

function methodShape(method, props = new Map()) {
  const statements = method.body?.children ?? [];
  const actIndex = statements.findIndex((stmt) => containsCall(stmt, SUBJECT_CALL));
  if (actIndex === -1) {
    return 'none';
  }
  const before = statements.slice(0, actIndex);
  const after = statements.slice(actIndex + 1);
  // The subject and its dispatcher may be built in setUp(), before the act,
  // or inline in the act: (new ProductRestockNotifier(...))->notify(...).
  const arranged = statementFacts([...before, statements[actIndex]], props);

  // Integration shape: EventHookDispatcher::fromContainer(...)->on(name, closure)
  // whose by-reference capture is asserted after the act.
  const captured = new Set();
  const usesHook = statementFacts(before, props).has('hook');
  for (const stmt of before) {
    walkPhp(stmt, (node) => {
      if (node.kind === 'call' && calledMethod(node) === 'on') {
        for (const arg of node.arguments ?? []) {
          if (arg.kind === 'closure') {
            for (const use of arg.uses ?? []) {
              if (use.byref) {
                captured.add(nodeName(use));
              }
            }
          }
        }
      }
    });
  }
  if (usesHook && captured.size > 0 && after.some((stmt) => isAssertionReferencing(stmt, captured))) {
    return 'hook';
  }

  // Unit shape: the test builds the notifier around a dispatcher it owns and
  // asserts on it after the act, or sets a mock expectation on dispatch().
  const ownsDispatcher = arranged.has('dispatcher');
  const buildsSubject = arranged.has('subject');
  let mockExpectsDispatch = false;
  for (const stmt of before) {
    walkPhp(stmt, (node) => {
      if (node.kind === 'call' && calledMethod(node) === 'method') {
        const first = node.arguments?.[0];
        if (first?.kind === 'string' && first.value === 'dispatch' && containsCall(node, 'expects')) {
          mockExpectsDispatch = true;
        }
      }
    });
  }
  if (ownsDispatcher && buildsSubject && (mockExpectsDispatch || after.some((stmt) => isAssertionReferencing(stmt, null)))) {
    return 'owned';
  }
  return 'none';
}

// --- helpers ----------------------------------------------------------------

// The short class name of a name node: `\Swag\Restock\Foo` -> `Foo`.
function typeName(node) {
  return nodeName(node).split('\\').pop() ?? '';
}

function calledMethod(call) {
  const what = call.what;
  if (!what) {
    return '';
  }
  if (what.kind === 'propertylookup' || what.kind === 'nullsafepropertylookup' || what.kind === 'staticlookup') {
    return nodeName(what.offset);
  }
  return nodeName(what);
}

function containsCall(node, method) {
  let found = false;
  walkPhp(node, (child) => {
    if (child.kind === 'call' && calledMethod(child) === method) {
      found = true;
    }
  });
  return found;
}

function isAssertCall(node) {
  if (node.kind !== 'call') {
    return false;
  }
  const name = calledMethod(node);
  return /^assert/.test(name) || name === 'fail';
}

function containsAssertion(node) {
  let found = false;
  walkPhp(node, (child) => {
    if (isAssertCall(child)) {
      found = true;
    }
  });
  return found;
}

// An assertion statement; when `vars` is given it must mention one of them.
function isAssertionReferencing(stmt, vars) {
  let hit = false;
  walkPhp(stmt, (node) => {
    if (!isAssertCall(node)) {
      return;
    }
    if (vars === null) {
      hit = true;
      return;
    }
    walkPhp(node.arguments ?? [], (arg) => {
      if (arg.kind === 'variable' && vars.has(nodeName(arg))) {
        hit = true;
      }
    });
  });
  return hit;
}

function isSharedDispatcherLookup(node) {
  let shared = false;
  walkPhp(node, (child) => {
    if (child.kind !== 'call' || calledMethod(child) !== 'get') {
      return;
    }
    const first = child.arguments?.[0];
    if (first?.kind === 'string' && first.value === 'event_dispatcher') {
      shared = true;
    }
    if (first?.kind === 'staticlookup' && /EventDispatcherInterface$/.test(nodeName(first.what))) {
      shared = true;
    }
  });
  return shared;
}

function refKey(node) {
  if (node?.kind === 'variable') {
    return `$${nodeName(node)}`;
  }
  if (node?.kind === 'propertylookup' && node.what?.kind === 'variable' && nodeName(node.what) === 'this') {
    return `this->${nodeName(node.offset)}`;
  }
  return '';
}

function collectSharedDispatcherRefs(ast) {
  const refs = new Set();
  walkPhp(ast, (node) => {
    if (node.kind === 'assign' && isSharedDispatcherLookup(node.right)) {
      const key = refKey(node.left);
      if (key) {
        refs.add(key);
      }
    }
  });
  return refs;
}

function receiverIsShared(receiver, sharedRefs) {
  if (!receiver) {
    return false;
  }
  const key = refKey(receiver);
  if (key && sharedRefs.has(key)) {
    return true;
  }
  return isSharedDispatcherLookup(receiver);
}

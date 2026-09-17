import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';

const source = readFileSync(new URL('../src/app/student/(app)/grammar/page.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 },
}).outputText;

test('Grammar page has no production gate (live since 2026-09-16, option A)', () => {
  // The UnavailableState gate was removed when the catalog + studied-state +
  // practice went live: both environments render the same live tree.
  assert.ok(
    !source.includes('UnavailableState'),
    'live page must not reference the production gate',
  );
  assert.ok(
    !source.includes('DemoStateSwitcher'),
    'live page must not ship the dev demo switcher',
  );
});

for (const environment of ['production', 'development']) {
  test(`Grammar page renders the live tree in ${environment}`, () => {
    const exports = {};
    function UnavailableState() {}
    const context = {
      exports,
      process: { env: { NODE_ENV: environment } },
      React,
      require(name) {
        if (name === 'react') return React;
        if (name === '@/components/student/unavailable-state') return { UnavailableState };
        return {};
      },
    };
    vm.runInNewContext(compiled, context);
    const result = exports.default();
    assert.notEqual(
      result.type,
      UnavailableState,
      'no environment may render the production gate anymore',
    );
  });
}

test('Grammar demo hooks stay inside the inner component', () => {
  // Hooks must not run at module scope or in the Suspense wrapper: the first
  // paint has to match the server. use* calls must only appear after the
  // inner component starts.
  const innerAt = source.indexOf('function GrammarInner');
  assert.ok(innerAt > 0, 'page keeps a GrammarInner component');
  const head = source.slice(0, innerAt);
  for (const hook of ['useState(', 'useEffect(', 'useMemo(', 'useRef(', 'useCallback(']) {
    // Imports live in the head; calls must not.
    const calls = head.split('\n').filter((line) => !line.trim().startsWith('import ') && line.includes(hook));
    assert.deepEqual(calls, [], `${hook} must not be called outside GrammarInner`);
  }
});

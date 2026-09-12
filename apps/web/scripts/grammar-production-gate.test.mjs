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

for (const environment of ['production', 'development']) {
  test(`Grammar page gates demo hooks in ${environment}`, () => {
    const exports = {};
    function UnavailableState() {}
    const context = {
      exports,
      process: { env: { NODE_ENV: environment } },
      React,
      require(name) {
        if (name === 'react') return {
          ...React,
          useState() { assert.fail('Page wrapper must not execute demo hooks'); },
          useMemo() { assert.fail('Page wrapper must not execute demo hooks'); },
        };
        if (name === '@/components/student/unavailable-state') return { UnavailableState };
        return {};
      },
    };
    vm.runInNewContext(compiled, context);
    const result = exports.default();
    if (environment === 'production') {
      assert.equal(result.type, UnavailableState);
      assert.equal(result.props.title, 'Thư viện ngữ pháp');
    } else {
      assert.equal(result.type.name, 'GrammarInner');
    }
  });
}

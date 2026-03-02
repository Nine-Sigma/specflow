import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'module';
import { walkTypescript } from './typescript.js';
import { walkJavascript } from './javascript.js';
import { walkPython } from './python.js';

const require = createRequire(import.meta.url);

let ParserClass: any;
let LanguageClass: any;

beforeAll(async () => {
  const mod = await import('web-tree-sitter');
  ParserClass = mod.Parser;
  LanguageClass = mod.Language;
  await ParserClass.init();
});

async function parseCode(code: string, grammarName: string) {
  const wasmPath = require.resolve(`@vscode/tree-sitter-wasm/wasm/tree-sitter-${grammarName}.wasm`);
  const grammar = await LanguageClass.load(wasmPath);
  const parser = new ParserClass();
  parser.setLanguage(grammar);
  return parser.parse(code);
}

describe('TypeScript walker', () => {
  it('extracts exported function', async () => {
    const tree = await parseCode(
      `export function greet(name: string): string { return name; }`,
      'typescript',
    );
    const result = walkTypescript(tree, 'src/greet.ts');
    const fn = result.symbols.find(s => s.name === 'greet');
    expect(fn).toBeDefined();
    expect(fn!.kind).toBe('function');
    expect(fn!.exported).toBe(true);
    expect(fn!.file).toBe('src/greet.ts');
    expect(fn!.signature).toContain('name: string');
  });

  it('extracts class with methods', async () => {
    const tree = await parseCode(
      `export class OrderService {
        createOrder(data: any) { return data; }
        private validate() { return true; }
      }`,
      'typescript',
    );
    const result = walkTypescript(tree, 'src/order.ts');
    const cls = result.symbols.find(s => s.name === 'OrderService');
    expect(cls).toBeDefined();
    expect(cls!.kind).toBe('class');
    expect(cls!.exported).toBe(true);

    const methods = result.symbols.filter(s => s.kind === 'method');
    expect(methods).toHaveLength(2);
    expect(methods.map(m => m.name)).toContain('createOrder');
    expect(methods.map(m => m.name)).toContain('validate');
    expect(methods[0].parent).toBe('OrderService');
  });

  it('extracts interface', async () => {
    const tree = await parseCode(
      `export interface UserConfig { name: string; age: number; }`,
      'typescript',
    );
    const result = walkTypescript(tree, 'src/types.ts');
    const iface = result.symbols.find(s => s.name === 'UserConfig');
    expect(iface).toBeDefined();
    expect(iface!.kind).toBe('interface');
    expect(iface!.exported).toBe(true);
  });

  it('extracts type alias', async () => {
    const tree = await parseCode(
      `export type Status = 'active' | 'inactive';`,
      'typescript',
    );
    const result = walkTypescript(tree, 'src/types.ts');
    const t = result.symbols.find(s => s.name === 'Status');
    expect(t).toBeDefined();
    expect(t!.kind).toBe('type');
  });

  it('extracts arrow function const', async () => {
    const tree = await parseCode(
      `export const add = (a: number, b: number): number => a + b;`,
      'typescript',
    );
    const result = walkTypescript(tree, 'src/math.ts');
    const fn = result.symbols.find(s => s.name === 'add');
    expect(fn).toBeDefined();
    expect(fn!.kind).toBe('function');
    expect(fn!.exported).toBe(true);
  });

  it('extracts imports', async () => {
    const tree = await parseCode(
      `import { readFile } from 'fs/promises';
import type { Config } from './config';
import * as path from 'path';
import React from 'react';`,
      'typescript',
    );
    const result = walkTypescript(tree, 'src/app.ts');
    expect(result.imports).toHaveLength(4);

    const fsImport = result.imports.find(i => i.source === 'fs/promises');
    expect(fsImport).toBeDefined();
    expect(fsImport!.names).toContainEqual({ imported: 'readFile', local: 'readFile' });

    const pathImport = result.imports.find(i => i.source === 'path');
    expect(pathImport).toBeDefined();
    expect(pathImport!.isNamespace).toBe(true);

    const reactImport = result.imports.find(i => i.source === 'react');
    expect(reactImport).toBeDefined();
    expect(reactImport!.isDefault).toBe(true);
  });

  it('extracts call sites', async () => {
    const tree = await parseCode(
      `import { helper } from './helper';
export function main() {
  helper();
  console.log('test');
  this.validate();
}`,
      'typescript',
    );
    const result = walkTypescript(tree, 'src/main.ts');
    const calls = result.calls;
    expect(calls.length).toBeGreaterThanOrEqual(2);

    const helperCall = calls.find(c => c.targetName === 'helper');
    expect(helperCall).toBeDefined();
    expect(helperCall!.isMethodCall).toBe(false);

    const logCall = calls.find(c => c.targetName === 'log');
    expect(logCall).toBeDefined();
    expect(logCall!.isMethodCall).toBe(true);
    expect(logCall!.receiver).toBe('console');
  });

  it('records default export for export default function', async () => {
    const tree = await parseCode(
      `export default function createApp(config: AppConfig): App { return new App(config); }`,
      'typescript',
    );
    const result = walkTypescript(tree, 'src/app.ts');

    const fn = result.symbols.find(s => s.name === 'createApp');
    expect(fn).toBeDefined();
    expect(fn!.exported).toBe(true);

    const defaultExport = result.exports.find(e => e.isDefault);
    expect(defaultExport).toBeDefined();
    expect(defaultExport!.name).toBe('createApp');
  });

  it('records default export for export default class', async () => {
    const tree = await parseCode(
      `export default class AppService { start() { return true; } }`,
      'typescript',
    );
    const result = walkTypescript(tree, 'src/service.ts');

    const cls = result.symbols.find(s => s.name === 'AppService');
    expect(cls).toBeDefined();
    expect(cls!.exported).toBe(true);

    const defaultExport = result.exports.find(e => e.isDefault);
    expect(defaultExport).toBeDefined();
    expect(defaultExport!.name).toBe('AppService');
  });

  it('extracts exported constant', async () => {
    const tree = await parseCode(
      `export const MAX_RETRIES = 3;`,
      'typescript',
    );
    const result = walkTypescript(tree, 'src/config.ts');
    const c = result.symbols.find(s => s.name === 'MAX_RETRIES');
    expect(c).toBeDefined();
    expect(c!.kind).toBe('constant');
    expect(c!.exported).toBe(true);
  });
});

describe('JavaScript walker', () => {
  it('extracts function and class but not interface or type', async () => {
    const tree = await parseCode(
      `export function greet(name) { return name; }
export class Service {
  process(data) { return data; }
}`,
      'javascript',
    );
    const result = walkJavascript(tree, 'src/service.js');
    const fn = result.symbols.find(s => s.name === 'greet');
    expect(fn).toBeDefined();
    expect(fn!.kind).toBe('function');

    const cls = result.symbols.find(s => s.name === 'Service');
    expect(cls).toBeDefined();
    expect(cls!.kind).toBe('class');

    // JS doesn't have interfaces/types
    expect(result.symbols.filter(s => s.kind === 'interface')).toHaveLength(0);
    expect(result.symbols.filter(s => s.kind === 'type')).toHaveLength(0);
  });

  it('extracts imports', async () => {
    const tree = await parseCode(
      `import express from 'express';
import { Router } from 'express';`,
      'javascript',
    );
    const result = walkJavascript(tree, 'src/app.js');
    expect(result.imports.length).toBeGreaterThanOrEqual(2);
  });

  it('extracts call sites', async () => {
    const tree = await parseCode(
      `export function handler(req, res) {
  const data = processRequest(req);
  res.json(data);
}`,
      'javascript',
    );
    const result = walkJavascript(tree, 'src/handler.js');
    expect(result.calls.some(c => c.targetName === 'processRequest')).toBe(true);
    expect(result.calls.some(c => c.targetName === 'json' && c.isMethodCall)).toBe(true);
  });

  it('records default export for export default function', async () => {
    const tree = await parseCode(
      `export default function createApp(config) { return { config }; }`,
      'javascript',
    );
    const result = walkJavascript(tree, 'src/app.js');

    const fn = result.symbols.find(s => s.name === 'createApp');
    expect(fn).toBeDefined();
    expect(fn!.exported).toBe(true);

    const defaultExport = result.exports.find(e => e.isDefault);
    expect(defaultExport).toBeDefined();
    expect(defaultExport!.name).toBe('createApp');
  });

  it('records default export for export default class', async () => {
    const tree = await parseCode(
      `export default class AppService { start() { return true; } }`,
      'javascript',
    );
    const result = walkJavascript(tree, 'src/service.js');

    const cls = result.symbols.find(s => s.name === 'AppService');
    expect(cls).toBeDefined();
    expect(cls!.exported).toBe(true);

    const defaultExport = result.exports.find(e => e.isDefault);
    expect(defaultExport).toBeDefined();
    expect(defaultExport!.name).toBe('AppService');
  });
});

describe('Python walker', () => {
  it('extracts function definitions', async () => {
    const tree = await parseCode(
      `def greet(name: str) -> str:
    return f"Hello {name}"

def _private_helper():
    pass`,
      'python',
    );
    const result = walkPython(tree, 'app/greet.py');
    const greet = result.symbols.find(s => s.name === 'greet');
    expect(greet).toBeDefined();
    expect(greet!.kind).toBe('function');
    expect(greet!.exported).toBe(true);
    expect(greet!.signature).toContain('name: str');

    const priv = result.symbols.find(s => s.name === '_private_helper');
    expect(priv).toBeDefined();
    expect(priv!.exported).toBe(false);
  });

  it('extracts class definitions with methods', async () => {
    const tree = await parseCode(
      `class OrderService:
    def create_order(self, data):
        return data

    def _validate(self):
        return True`,
      'python',
    );
    const result = walkPython(tree, 'app/order.py');
    const cls = result.symbols.find(s => s.name === 'OrderService');
    expect(cls).toBeDefined();
    expect(cls!.kind).toBe('class');

    const methods = result.symbols.filter(s => s.kind === 'method');
    expect(methods).toHaveLength(2);
    expect(methods[0].parent).toBe('OrderService');
  });

  it('extracts module-level constants', async () => {
    const tree = await parseCode(
      `MAX_RETRIES = 3
DEFAULT_TIMEOUT = 30
lowercase_var = "not a constant"`,
      'python',
    );
    const result = walkPython(tree, 'app/config.py');
    const constants = result.symbols.filter(s => s.kind === 'constant');
    expect(constants.map(c => c.name)).toContain('MAX_RETRIES');
    expect(constants.map(c => c.name)).toContain('DEFAULT_TIMEOUT');
    expect(constants.map(c => c.name)).not.toContain('lowercase_var');
  });

  it('extracts imports', async () => {
    const tree = await parseCode(
      `import os
from pathlib import Path
from .utils import helper`,
      'python',
    );
    const result = walkPython(tree, 'app/main.py');
    expect(result.imports.length).toBeGreaterThanOrEqual(3);

    const osImport = result.imports.find(i => i.source === 'os');
    expect(osImport).toBeDefined();

    const pathImport = result.imports.find(i => i.names.some(n => n.imported === 'Path'));
    expect(pathImport).toBeDefined();
  });

  it('extracts call sites', async () => {
    const tree = await parseCode(
      `def main():
    data = load_data()
    result = process(data)
    self.validate(result)`,
      'python',
    );
    const result = walkPython(tree, 'app/main.py');
    expect(result.calls.some(c => c.targetName === 'load_data')).toBe(true);
    expect(result.calls.some(c => c.targetName === 'process')).toBe(true);
    expect(result.calls.some(c => c.targetName === 'validate' && c.isMethodCall)).toBe(true);
  });
});

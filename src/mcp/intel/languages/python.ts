/**
 * Python AST walker.
 * Extracts symbols, calls, imports, and exports from tree-sitter Python parse trees.
 */

import type { Tree, Node as SyntaxNode } from 'web-tree-sitter';
import type { SymbolInfo, CallSite, ImportInfo, ExportInfo, ExtractionResult } from '../types.js';

/**
 * Walk a Python parse tree and extract structural information.
 */
export function walkPython(tree: Tree, filePath: string): ExtractionResult {
  const symbols: SymbolInfo[] = [];
  const calls: CallSite[] = [];
  const imports: ImportInfo[] = [];
  const exports: ExportInfo[] = [];

  walkNode(tree.rootNode, filePath, null, false, symbols, calls, imports, exports);

  return { symbols, calls, imports, exports };
}

function walkNode(
  node: SyntaxNode,
  filePath: string,
  parentClass: string | null,
  inClass: boolean,
  symbols: SymbolInfo[],
  calls: CallSite[],
  imports: ImportInfo[],
  exports: ExportInfo[],
): void {
  switch (node.type) {
    case 'function_definition': {
      const nameNode = node.childForFieldName('name');
      if (nameNode) {
        const name = nameNode.text;
        const kind = inClass ? 'method' as const : 'function' as const;
        const qualifiedName = parentClass ? `${parentClass}.${name}` : name;

        symbols.push({
          name,
          kind,
          file: filePath,
          line: node.startPosition.row + 1,
          endLine: node.endPosition.row + 1,
          exported: !name.startsWith('_'), // Python convention: _ prefix = private
          parent: parentClass || undefined,
          signature: extractPythonSignature(node),
        });

        // Extract calls from function body
        const body = node.childForFieldName('body');
        if (body) extractCalls(body, qualifiedName, filePath, calls);
      }
      return; // Don't recurse into nested functions
    }

    case 'class_definition': {
      const nameNode = node.childForFieldName('name');
      if (nameNode) {
        const className = nameNode.text;
        symbols.push({
          name: className,
          kind: 'class',
          file: filePath,
          line: node.startPosition.row + 1,
          endLine: node.endPosition.row + 1,
          exported: !className.startsWith('_'),
        });

        // Walk class body with class as parent
        const body = node.childForFieldName('body');
        if (body) {
          for (const child of body.children) {
            walkNode(child, filePath, className, true, symbols, calls, imports, exports);
          }
        }
      }
      return;
    }

    case 'expression_statement': {
      // Module-level UPPER_CASE assignments are constants
      const expr = node.firstChild;
      if (expr?.type === 'assignment' && !inClass && node.parent?.type === 'module') {
        const left = expr.childForFieldName('left');
        if (left?.type === 'identifier' && /^[A-Z][A-Z0-9_]+$/.test(left.text)) {
          symbols.push({
            name: left.text,
            kind: 'constant',
            file: filePath,
            line: node.startPosition.row + 1,
            endLine: node.endPosition.row + 1,
            exported: true,
          });
        }
      }
      break;
    }

    case 'import_statement': {
      extractPythonImport(node, filePath, imports);
      return;
    }

    case 'import_from_statement': {
      extractPythonFromImport(node, filePath, imports);
      return;
    }
  }

  // Recurse for other node types
  for (const child of node.children) {
    walkNode(child, filePath, parentClass, inClass, symbols, calls, imports, exports);
  }
}

/**
 * Extract Python function signature from parameters and return type hint.
 */
function extractPythonSignature(node: SyntaxNode): string | undefined {
  const params = node.childForFieldName('parameters');
  const returnType = node.childForFieldName('return_type');
  if (!params) return undefined;

  const paramsText = params.text;
  if (returnType) {
    return `${paramsText} -> ${returnType.text}`;
  }
  return paramsText;
}

/**
 * Extract call sites from a Python function body.
 */
function extractCalls(
  node: SyntaxNode,
  callerSymbol: string,
  filePath: string,
  calls: CallSite[],
): void {
  if (node.type === 'call') {
    const functionNode = node.childForFieldName('function');
    if (functionNode) {
      const callInfo = parseCallTarget(functionNode);
      if (callInfo) {
        calls.push({
          callerSymbol,
          targetName: callInfo.name,
          file: filePath,
          line: node.startPosition.row + 1,
          isMethodCall: callInfo.isMethod,
          receiver: callInfo.receiver,
        });
      }
    }
  }

  for (const child of node.children) {
    // Don't recurse into nested function/class definitions
    if (child.type === 'function_definition' || child.type === 'class_definition') {
      continue;
    }
    extractCalls(child, callerSymbol, filePath, calls);
  }
}

function parseCallTarget(node: SyntaxNode): { name: string; isMethod: boolean; receiver?: string } | null {
  if (node.type === 'identifier') {
    return { name: node.text, isMethod: false };
  }

  if (node.type === 'attribute') {
    const object = node.childForFieldName('object');
    const attribute = node.childForFieldName('attribute');
    if (object && attribute) {
      return {
        name: attribute.text,
        isMethod: true,
        receiver: object.text,
      };
    }
  }

  return null;
}

/**
 * Extract from `import module` statements.
 */
function extractPythonImport(node: SyntaxNode, filePath: string, imports: ImportInfo[]): void {
  for (const child of node.children) {
    if (child.type === 'dotted_name') {
      imports.push({
        source: child.text,
        names: [{ imported: child.text, local: child.text }],
        isDefault: false,
        isNamespace: true,
        file: filePath,
      });
    } else if (child.type === 'aliased_import') {
      const nameNode = child.childForFieldName('name');
      const alias = child.childForFieldName('alias');
      if (nameNode) {
        imports.push({
          source: nameNode.text,
          names: [{ imported: nameNode.text, local: alias?.text || nameNode.text }],
          isDefault: false,
          isNamespace: true,
          file: filePath,
        });
      }
    }
  }
}

/**
 * Extract from `from module import name` statements.
 */
function extractPythonFromImport(node: SyntaxNode, filePath: string, imports: ImportInfo[]): void {
  const moduleNode = node.childForFieldName('module_name');
  if (!moduleNode) return;

  const source = moduleNode.text;
  const names: Array<{ imported: string; local: string }> = [];

  for (const child of node.children) {
    if (child.type === 'dotted_name' && child !== moduleNode) {
      names.push({ imported: child.text, local: child.text });
    } else if (child.type === 'aliased_import') {
      const nameNode = child.childForFieldName('name');
      const alias = child.childForFieldName('alias');
      if (nameNode) {
        names.push({ imported: nameNode.text, local: alias?.text || nameNode.text });
      }
    }
  }

  // Check for relative import (dots before module name)
  const isRelative = node.text.includes('from .') || node.text.includes('from ..');

  imports.push({
    source: isRelative ? '.' + source : source,
    names,
    isDefault: false,
    isNamespace: false,
    file: filePath,
  });
}

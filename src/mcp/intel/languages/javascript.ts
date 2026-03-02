/**
 * JavaScript/JSX AST walker.
 * Subset of the TypeScript walker, omitting TS-specific node types
 * (interface_declaration, type_alias_declaration, type_annotation).
 */

import type { Tree, Node as SyntaxNode } from 'web-tree-sitter';
import type { SymbolInfo, CallSite, ImportInfo, ExportInfo, ExtractionResult } from '../types.js';

/**
 * Walk a JavaScript/JSX parse tree and extract structural information.
 */
export function walkJavascript(tree: Tree, filePath: string): ExtractionResult {
  const symbols: SymbolInfo[] = [];
  const calls: CallSite[] = [];
  const imports: ImportInfo[] = [];
  const exports: ExportInfo[] = [];

  walkNode(tree.rootNode, filePath, null, symbols, calls, imports, exports);

  return { symbols, calls, imports, exports };
}

function walkNode(
  node: SyntaxNode,
  filePath: string,
  parentClass: string | null,
  symbols: SymbolInfo[],
  calls: CallSite[],
  imports: ImportInfo[],
  exports: ExportInfo[],
): void {
  const isExported = isExportedNode(node);

  switch (node.type) {
    case 'function_declaration': {
      const nameNode = node.childForFieldName('name');
      if (nameNode) {
        const name = nameNode.text;
        const qualifiedName = parentClass ? `${parentClass}.${name}` : name;
        symbols.push({
          name,
          kind: 'function',
          file: filePath,
          line: node.startPosition.row + 1,
          endLine: node.endPosition.row + 1,
          exported: isExported,
          parent: parentClass || undefined,
          signature: extractFunctionSignature(node),
        });
        const body = node.childForFieldName('body');
        if (body) extractCalls(body, qualifiedName, filePath, calls);
      }
      break;
    }

    case 'class_declaration': {
      const nameNode = node.childForFieldName('name');
      if (nameNode) {
        const className = nameNode.text;
        symbols.push({
          name: className,
          kind: 'class',
          file: filePath,
          line: node.startPosition.row + 1,
          endLine: node.endPosition.row + 1,
          exported: isExported,
        });
        const body = node.childForFieldName('body');
        if (body) {
          for (const child of body.children) {
            walkNode(child, filePath, className, symbols, calls, imports, exports);
          }
        }
      }
      return;
    }

    case 'method_definition': {
      const nameNode = node.childForFieldName('name');
      if (nameNode && parentClass) {
        const name = nameNode.text;
        const qualifiedName = `${parentClass}.${name}`;
        symbols.push({
          name,
          kind: 'method',
          file: filePath,
          line: node.startPosition.row + 1,
          endLine: node.endPosition.row + 1,
          exported: false,
          parent: parentClass,
          signature: extractFunctionSignature(node),
        });
        const body = node.childForFieldName('body');
        if (body) extractCalls(body, qualifiedName, filePath, calls);
      }
      return;
    }

    // NOTE: No interface_declaration, type_alias_declaration handling (JS doesn't have these)

    case 'lexical_declaration': {
      for (const declarator of node.children) {
        if (declarator.type === 'variable_declarator') {
          const nameNode = declarator.childForFieldName('name');
          const valueNode = declarator.childForFieldName('value');
          if (nameNode && valueNode) {
            if (valueNode.type === 'arrow_function' || valueNode.type === 'function') {
              const name = nameNode.text;
              const qualifiedName = parentClass ? `${parentClass}.${name}` : name;
              symbols.push({
                name,
                kind: 'function',
                file: filePath,
                line: node.startPosition.row + 1,
                endLine: node.endPosition.row + 1,
                exported: isExported,
                parent: parentClass || undefined,
                signature: extractArrowSignature(valueNode),
              });
              const body = valueNode.childForFieldName('body');
              if (body) extractCalls(body, qualifiedName, filePath, calls);
            } else if (isExported) {
              symbols.push({
                name: nameNode.text,
                kind: 'constant',
                file: filePath,
                line: node.startPosition.row + 1,
                endLine: node.endPosition.row + 1,
                exported: true,
              });
            }
          }
        }
      }
      return;
    }

    case 'import_statement': {
      extractImport(node, filePath, imports);
      return;
    }

    case 'export_statement': {
      const declaration = node.childForFieldName('declaration');
      const isDefaultExport = node.text.startsWith('export default');

      if (declaration) {
        walkNode(declaration, filePath, parentClass, symbols, calls, imports, exports);

        // export default function Foo() / export default class Foo
        if (isDefaultExport) {
          const declName = declaration.childForFieldName('name');
          exports.push({
            name: declName ? declName.text : 'default',
            isDefault: true,
            file: filePath,
          });
        }
      }

      const exportClause = node.children.find(c => c.type === 'export_clause');
      if (exportClause) {
        for (const specifier of exportClause.children) {
          if (specifier.type === 'export_specifier') {
            const nameNode = specifier.childForFieldName('name');
            if (nameNode) {
              exports.push({ name: nameNode.text, isDefault: false, file: filePath });
            }
          }
        }
      }

      // export default <identifier> / export default <call>
      if (isDefaultExport && !declaration) {
        const defaultChild = node.children.find(c => c.type === 'identifier' || c.type === 'call_expression');
        if (defaultChild) {
          exports.push({
            name: defaultChild.type === 'identifier' ? defaultChild.text : 'default',
            isDefault: true,
            file: filePath,
          });
        }
      }
      return;
    }
  }

  for (const child of node.children) {
    walkNode(child, filePath, parentClass, symbols, calls, imports, exports);
  }
}

function isExportedNode(node: SyntaxNode): boolean {
  const parent = node.parent;
  if (!parent) return false;
  if (parent.type === 'export_statement') return true;
  return false;
}

function extractFunctionSignature(node: SyntaxNode): string | undefined {
  const params = node.childForFieldName('parameters');
  if (!params) return undefined;
  return params.text;
}

function extractArrowSignature(node: SyntaxNode): string | undefined {
  const params = node.childForFieldName('parameters');
  if (!params) {
    const firstChild = node.firstChild;
    if (firstChild?.type === 'identifier') {
      return `(${firstChild.text})`;
    }
    return undefined;
  }
  return params.text;
}

function extractCalls(
  node: SyntaxNode,
  callerSymbol: string,
  filePath: string,
  calls: CallSite[],
): void {
  if (node.type === 'call_expression') {
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
    if (child.type === 'arrow_function' || child.type === 'function_declaration' ||
        child.type === 'function' || child.type === 'method_definition') {
      continue;
    }
    extractCalls(child, callerSymbol, filePath, calls);
  }
}

function parseCallTarget(node: SyntaxNode): { name: string; isMethod: boolean; receiver?: string } | null {
  if (node.type === 'identifier') {
    return { name: node.text, isMethod: false };
  }
  if (node.type === 'member_expression') {
    const object = node.childForFieldName('object');
    const property = node.childForFieldName('property');
    if (object && property) {
      return { name: property.text, isMethod: true, receiver: object.text };
    }
  }
  return null;
}

function extractImport(node: SyntaxNode, filePath: string, imports: ImportInfo[]): void {
  const sourceNode = node.childForFieldName('source');
  if (!sourceNode) return;

  const source = sourceNode.text.replace(/^['"]|['"]$/g, '');
  const names: Array<{ imported: string; local: string }> = [];
  let isDefault = false;
  let isNamespace = false;

  for (const child of node.children) {
    if (child.type === 'import_clause') {
      for (const clauseChild of child.children) {
        if (clauseChild.type === 'identifier') {
          isDefault = true;
          names.push({ imported: 'default', local: clauseChild.text });
        } else if (clauseChild.type === 'named_imports') {
          for (const specifier of clauseChild.children) {
            if (specifier.type === 'import_specifier') {
              const importedName = specifier.childForFieldName('name');
              const alias = specifier.childForFieldName('alias');
              if (importedName) {
                names.push({
                  imported: importedName.text,
                  local: alias ? alias.text : importedName.text,
                });
              }
            }
          }
        } else if (clauseChild.type === 'namespace_import') {
          isNamespace = true;
          const nameNode = clauseChild.children.find(c => c.type === 'identifier');
          if (nameNode) names.push({ imported: '*', local: nameNode.text });
        }
      }
    }
  }

  imports.push({ source, names, isDefault, isNamespace, file: filePath });
}

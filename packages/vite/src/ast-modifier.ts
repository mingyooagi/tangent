import { readFile, writeFile } from 'fs/promises'
import { parseModule, generateCode } from 'magicast'

export async function updateSourceFile(
  filePath: string,
  id: string,
  key: string,
  value: unknown
): Promise<void> {
  const content = await readFile(filePath, 'utf-8')
  const mod = parseModule(content, { sourceFileName: filePath })
  const ast = mod.$ast

  const updated = findAndUpdateUseTangent(ast, id, key, value)

  if (!updated) {
    throw new Error(`Could not find useTangent('${id}') with key '${key}' in ${filePath}`)
  }

  const { code } = generateCode(mod)
  await writeFile(filePath, code, 'utf-8')
}

function findAndUpdateUseTangent(
  ast: any,
  targetId: string,
  key: string,
  value: unknown
): boolean {
  let found = false
  const visited = new WeakSet()

  function traverse(node: any): void {
    if (!node || typeof node !== 'object') return
    if (visited.has(node)) return
    visited.add(node)

    if (isUseTangentCall(node)) {
      const [idArg, configArg] = node.arguments

      if (isMatchingTangentCall(idArg, configArg, targetId)) {
        for (const prop of configArg.properties) {
          if (isTargetProperty(prop, key)) {
            prop.value = createLiteralNode(value)
            found = true
            return
          }
        }
      }
    }

    for (const childKey of Object.keys(node)) {
      if (childKey === 'loc' || childKey === 'start' || childKey === 'end') continue
      const child = node[childKey]
      if (Array.isArray(child)) {
        child.forEach(traverse)
      } else if (child && typeof child === 'object') {
        traverse(child)
      }
    }
  }

  traverse(ast)
  return found
}

function isUseTangentCall(node: any): boolean {
  return (
    node.type === 'CallExpression' &&
    node.callee?.type === 'Identifier' &&
    node.callee?.name === 'useTangent' &&
    node.arguments?.length >= 2
  )
}

function isMatchingTangentCall(idArg: any, configArg: any, targetId: string): boolean {
  return (
    idArg?.type === 'StringLiteral' &&
    idArg?.value === targetId &&
    configArg?.type === 'ObjectExpression'
  )
}

function isTargetProperty(prop: any, key: string): boolean {
  return (
    prop.type === 'ObjectProperty' &&
    prop.key?.type === 'Identifier' &&
    prop.key?.name === key
  )
}

function createLiteralNode(value: unknown): any {
  if (typeof value === 'number') {
    return { type: 'NumericLiteral', value }
  }
  if (typeof value === 'string') {
    return { type: 'StringLiteral', value }
  }
  if (typeof value === 'boolean') {
    return { type: 'BooleanLiteral', value }
  }
  if (value === null) {
    return { type: 'NullLiteral' }
  }
  throw new Error(`Unsupported value type: ${typeof value}`)
}

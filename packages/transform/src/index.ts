export function injectFilePath(code: string, filePath: string): string | null {
  if (!code.includes('useTangent')) {
    return null
  }

  let hasChanges = false
  let result = ''
  let i = 0

  while (i < code.length) {
    const useTangentIndex = code.indexOf('useTangent(', i)
    
    if (useTangentIndex === -1) {
      result += code.slice(i)
      break
    }

    result += code.slice(i, useTangentIndex)
    
    const openParen = useTangentIndex + 'useTangent'.length
    const callEnd = findMatchingParen(code, openParen)
    
    if (callEnd === -1) {
      result += code.slice(useTangentIndex)
      break
    }

    const callContent = code.slice(openParen + 1, callEnd)
    
    if (callContent.includes('filePath')) {
      result += code.slice(useTangentIndex, callEnd + 1)
      i = callEnd + 1
      continue
    }

    const args = parseArgs(callContent)
    
    if (args.length === 2) {
      hasChanges = true
      result += `useTangent(${args[0]}, ${args[1]}, { filePath: '${filePath}' })`
    } else {
      result += code.slice(useTangentIndex, callEnd + 1)
    }
    
    i = callEnd + 1
  }

  return hasChanges ? result : null
}

function findMatchingParen(code: string, openIndex: number): number {
  let depth = 1
  let i = openIndex + 1
  let inString: string | null = null
  
  while (i < code.length && depth > 0) {
    const char = code[i]
    const prevChar = code[i - 1]
    
    if (inString) {
      if (char === inString && prevChar !== '\\') {
        inString = null
      }
    } else {
      if (char === '"' || char === "'" || char === '`') {
        inString = char
      } else if (char === '(') {
        depth++
      } else if (char === ')') {
        depth--
      }
    }
    
    i++
  }
  
  return depth === 0 ? i - 1 : -1
}

function parseArgs(content: string): string[] {
  const args: string[] = []
  let depth = 0
  let currentArg = ''
  let inString: string | null = null
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    const prevChar = content[i - 1]
    
    if (inString) {
      currentArg += char
      if (char === inString && prevChar !== '\\') {
        inString = null
      }
    } else {
      if (char === '"' || char === "'" || char === '`') {
        inString = char
        currentArg += char
      } else if (char === '{' || char === '[' || char === '(') {
        depth++
        currentArg += char
      } else if (char === '}' || char === ']' || char === ')') {
        depth--
        currentArg += char
      } else if (char === ',' && depth === 0) {
        args.push(currentArg.trim())
        currentArg = ''
      } else {
        currentArg += char
      }
    }
  }
  
  if (currentArg.trim()) {
    args.push(currentArg.trim())
  }
  
  return args
}

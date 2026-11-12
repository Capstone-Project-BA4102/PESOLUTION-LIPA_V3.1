export function parseSkillText(value: string): string[] {
  const items: string[] = []
  let current = ''
  let quote = ''
  let depth = 0
  const push = () => {
    const skill = current.trim().replace(/^['"]|['"]$/g, '').trim()
    if (skill && !items.some(item => item.toLowerCase() === skill.toLowerCase())) items.push(skill)
    current = ''
  }

  for (const char of String(value || '')) {
    if ((char === '"' || char === "'") && (!quote || quote === char)) {
      quote = quote ? '' : char
      current += char
      continue
    }
    if (!quote && char === '(') depth += 1
    if (!quote && char === ')' && depth > 0) depth -= 1
    if (!quote && depth === 0 && (char === ',' || char === ';' || char === '\n')) push()
    else current += char
  }
  push()
  return items
}

export const formatSkillText = (skills: string[]) => skills.join('\n')

export type DomainType = 'Wildcard' | 'Single Domain' | 'Multi Domain' | 'Unknown'

function uniqueNames(commonName: string, sans: string[]): string[] {
  const names = [commonName, ...sans]
    .map(name => name.trim().toLowerCase())
    .filter(Boolean)
  return [...new Set(names)]
}

export function classifyDomainType(commonName: string, sans: string[]): DomainType {
  const names = uniqueNames(commonName, sans)
  if (names.length === 0) return 'Unknown'
  if (names.some(name => name.startsWith('*.'))) return 'Wildcard'
  return names.length > 1 ? 'Multi Domain' : 'Single Domain'
}

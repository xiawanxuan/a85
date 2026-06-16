import type { XRFElement, XRFSample } from '../types'

const ELEMENT_PATTERN = /^[A-Z][a-z]?$/

function isElementSymbol(token: string): boolean {
  return ELEMENT_PATTERN.test(token)
}

function detectDelimiter(line: string): string | null {
  const candidates = ['\t', ',', ';', '|']
  for (const d of candidates) {
    if (line.includes(d)) return d
  }
  return null
}

function parseLine(line: string, delimiter: string | null): string[] {
  const trimmed = line.trim()
  if (!trimmed) return []
  if (delimiter) {
    return trimmed.split(delimiter).map(s => s.trim())
  }
  return trimmed.split(/\s+/).map(s => s.trim())
}

function classifyHeaders(tokens: string[]): {
  elementColumns: Map<number, string>
  errorColumns: Map<number, number>
} {
  const elementColumns = new Map<number, string>()
  const errorColumns = new Map<number, number>()

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!
    if (isElementSymbol(t)) {
      elementColumns.set(i, t)
    } else {
      const lower = t.toLowerCase()
      for (const [j, sym] of elementColumns) {
        if (lower === `${sym.toLowerCase()}_err` || lower === `${sym.toLowerCase()}_sd`) {
          errorColumns.set(i, j)
          break
        }
      }
    }
  }

  return { elementColumns, errorColumns }
}

function parseRow(
  tokens: string[],
  elementColumns: Map<number, string>,
  errorColumns: Map<number, number>,
): XRFElement[] {
  const elements: XRFElement[] = []

  for (const [colIdx, symbol] of elementColumns) {
    const raw = tokens[colIdx]
    if (raw === undefined || raw === '') continue
    const intensity = parseFloat(raw)
    if (isNaN(intensity)) continue

    let error: number | undefined
    for (const [errIdx, elemIdx] of errorColumns) {
      if (elemIdx === colIdx) {
        const errRaw = tokens[errIdx]
        if (errRaw !== undefined && errRaw !== '') {
          const parsed = parseFloat(errRaw)
          if (!isNaN(parsed)) error = parsed
        }
        break
      }
    }

    elements.push(error !== undefined ? { symbol, intensity, error } : { symbol, intensity })
  }

  return elements
}

export function parseXRFData(content: string, fileName?: string): XRFSample[] {
  const lines = content.split(/\r?\n/).filter(l => l.trim() !== '')
  if (lines.length === 0) return []

  const firstLine = lines[0]!
  const delimiter = detectDelimiter(firstLine)
  const headerTokens = parseLine(firstLine, delimiter)
  const { elementColumns, errorColumns } = classifyHeaders(headerTokens)

  if (elementColumns.size === 0) return []

  const samples: XRFSample[] = []

  let nameColIdx = -1
  let idColIdx = -1
  for (let i = 0; i < headerTokens.length; i++) {
    const ht = headerTokens[i]!
    const lower = ht.toLowerCase()
    if (lower === 'name' || lower === 'sample' || lower === 'sample_name') nameColIdx = i
    if (lower === 'id' || lower === 'sample_id') idColIdx = i
  }

  for (let rowIdx = 1; rowIdx < lines.length; rowIdx++) {
    const line = lines[rowIdx]!
    const tokens = parseLine(line, delimiter)
    if (tokens.length === 0) continue

    const elements = parseRow(tokens, elementColumns, errorColumns)
    if (elements.length === 0) continue

    const idToken = idColIdx >= 0 ? tokens[idColIdx] : undefined
    const nameToken = nameColIdx >= 0 ? tokens[nameColIdx] : undefined
    const id = idToken ? idToken.trim() : `sample_${rowIdx}`
    const name = nameToken ? nameToken.trim() : id

    samples.push({
      id,
      name,
      elements,
      source: fileName,
    })
  }

  return samples
}

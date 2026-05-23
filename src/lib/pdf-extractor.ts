import fs from 'fs/promises'
// pdf-parse is imported this way to avoid its test file loading in non-test environments
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse')

export interface ExtractedTable {
  title?: string
  columns: string[]
  points: Array<{ label: string; values: Record<string, number> }>
}

export interface PdfExtractionResult {
  tables: ExtractedTable[]
  rawText: string
  pageCount: number
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

export async function extractFromPdf(filePath: string): Promise<PdfExtractionResult> {
  const buffer = await fs.readFile(filePath)
  const parsed = await pdfParse(buffer)

  const rawText: string = parsed.text
  const pageCount: number = parsed.numpages

  const tables = detectTables(rawText)

  return { tables, rawText, pageCount }
}

// ─────────────────────────────────────────────
// Table detection — tries strategies in order
// ─────────────────────────────────────────────

function detectTables(text: string): ExtractedTable[] {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  // Strategy 1: delimiter-separated (CSV / TSV / semicolon)
  for (const delimiter of ['\t', ';', ',']) {
    const table = tryParseDelimited(lines, delimiter)
    if (table) return splitByPageBreaks(text, table)
  }

  // Strategy 2: whitespace-aligned numeric table
  const wsTable = tryParseWhitespaceTable(lines)
  if (wsTable) return [wsTable]

  // Strategy 3: key–value pairs (Label: Number)
  const kvTable = tryParseKeyValue(lines)
  if (kvTable) return [kvTable]

  return []
}

// ─────────────────────────────────────────────
// Strategy 1 — delimiter-separated lines
// ─────────────────────────────────────────────

function tryParseDelimited(lines: string[], delimiter: string): ExtractedTable | null {
  const split = lines.map((l) => l.split(delimiter).map((c) => c.trim()))
  const valid = split.filter((r) => r.length >= 2)
  if (valid.length < 2) return null

  const targetCount = mostCommon(valid.map((r) => r.length))
  if (targetCount < 2) return null

  const tableLines = valid.filter((r) => r.length === targetCount)
  if (tableLines.length < 2) return null

  const [headerRow, ...dataRows] = tableLines
  const seriesNames = headerRow.slice(1).filter(Boolean)
  if (seriesNames.length === 0) return null

  const points = dataRows
    .map((row) => {
      const label = row[0]
      const values: Record<string, number> = {}
      seriesNames.forEach((name, i) => {
        const val = parseNumber(row[i + 1] ?? '')
        if (val !== null) values[name] = val
      })
      return { label, values }
    })
    .filter((p) => Object.keys(p.values).length > 0)

  if (points.length === 0) return null

  return { columns: seriesNames, points }
}

// ─────────────────────────────────────────────
// Strategy 2 — whitespace-aligned table
// (lines with 2+ space-separated numeric tokens)
// ─────────────────────────────────────────────

function tryParseWhitespaceTable(lines: string[]): ExtractedTable | null {
  // Find lines that contain mostly numbers separated by spaces
  const numericLines = lines.filter((l) => {
    const tokens = l.split(/\s{2,}/)
    const nums = tokens.slice(1).filter((t) => parseNumber(t) !== null)
    return tokens.length >= 2 && nums.length >= 1
  })

  if (numericLines.length < 2) return null

  // Find the header line — the line just before the first numeric line
  const firstNumIdx = lines.indexOf(numericLines[0])
  const headerLine = firstNumIdx > 0 ? lines[firstNumIdx - 1] : null

  // Derive column count from the mode of numeric line token counts
  const tokenCounts = numericLines.map((l) => l.split(/\s{2,}/).length)
  const targetCount = mostCommon(tokenCounts)
  const consistent = numericLines.filter((l) => l.split(/\s{2,}/).length === targetCount)

  const seriesNames: string[] = headerLine
    ? headerLine.split(/\s{2,}/).slice(1).filter(Boolean)
    : Array.from({ length: targetCount - 1 }, (_, i) => `Série ${i + 1}`)

  const points = consistent
    .map((line) => {
      const tokens = line.split(/\s{2,}/)
      const label = tokens[0]
      const values: Record<string, number> = {}
      seriesNames.forEach((name, i) => {
        const val = parseNumber(tokens[i + 1] ?? '')
        if (val !== null) values[name] = val
      })
      return { label, values }
    })
    .filter((p) => Object.keys(p.values).length > 0)

  if (points.length < 2) return null

  return { columns: seriesNames, points }
}

// ─────────────────────────────────────────────
// Strategy 3 — key–value pairs
// e.g. "Receita: 50.000" or "Receita 50000"
// ─────────────────────────────────────────────

function tryParseKeyValue(lines: string[]): ExtractedTable | null {
  const pattern = /^(.+?)[\s:–-]+([+-]?[\d.,]+)\s*(%|[A-Z]{3})?$/

  const pairs = lines
    .map((l) => {
      const m = l.match(pattern)
      if (!m) return null
      const val = parseNumber(m[2])
      if (val === null) return null
      return { label: m[1].trim(), value: val }
    })
    .filter((p): p is { label: string; value: number } => p !== null)

  if (pairs.length < 2) return null

  return {
    columns: ['Valor'],
    points: pairs.map((p) => ({ label: p.label, values: { Valor: p.value } })),
  }
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Parses a number string handling both BR format (1.234,56) and standard (1,234.56).
 * Returns null when the string is not a valid number.
 */
export function parseNumber(raw: string): number | null {
  const s = raw.replace(/[^\d.,+-]/g, '').trim()
  if (!s) return null

  // BR format: dot as thousands separator, comma as decimal
  // e.g. 1.234.567,89
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
    return parseFloat(s.replace(/\./g, '').replace(',', '.'))
  }

  // Standard format: comma as thousands separator, dot as decimal
  // e.g. 1,234,567.89
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) {
    return parseFloat(s.replace(/,/g, ''))
  }

  // Plain float (may use comma as decimal without thousands separator)
  const plain = s.replace(',', '.')
  const n = parseFloat(plain)
  return isNaN(n) ? null : n
}

function mostCommon(arr: number[]): number {
  const freq: Record<number, number> = {}
  for (const v of arr) freq[v] = (freq[v] ?? 0) + 1
  return parseInt(Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0])
}

/**
 * If the PDF has multiple pages and the extractor found one big merged table,
 * attempt to split it by detecting repeated header blocks.
 * Falls back to returning the single table when no clear splits are found.
 */
function splitByPageBreaks(rawText: string, table: ExtractedTable): ExtractedTable[] {
  // Heuristic: if the text contains form feeds (\f) or "Page N" markers, try splitting
  const pageMarkers = rawText.split(/\f|\n-{5,}\n/)
  if (pageMarkers.length <= 1) return [table]

  // For now return the merged table — deeper page-level splitting is left for future work
  return [table]
}

import PDFDocument from 'pdfkit'

export interface DataRecordForPdf {
  columns: { id: string; name: string; displayOrder: number }[]
  points: {
    id: string
    label: string
    displayOrder: number
    values: { dataColumnId: string; value: number }[]
  }[]
}

export function buildDataPdf(title: string, record: DataRecordForPdf): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' })
    const chunks: Buffer[] = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const left = doc.page.margins.left
    const right = doc.page.width - doc.page.margins.right
    const bottom = doc.page.height - doc.page.margins.bottom
    const rowHeight = 20

    doc.font('Helvetica-Bold').fontSize(16).text(title, left, doc.y)
    doc.moveDown(1.5)

    const headers = ['Categoria', ...record.columns.map((c) => c.name)]
    const colWidth = (right - left) / headers.length

    function drawHeaderRow(y: number) {
      doc.font('Helvetica-Bold').fontSize(10)
      headers.forEach((h, i) => {
        doc.text(h, left + i * colWidth, y, { width: colWidth - 6 })
      })
      doc
        .moveTo(left, y + rowHeight - 6)
        .lineTo(right, y + rowHeight - 6)
        .strokeColor('#d1d5db')
        .stroke()
    }

    let y = doc.y
    drawHeaderRow(y)
    y += rowHeight

    doc.font('Helvetica').fontSize(10)
    for (const point of record.points) {
      if (y + rowHeight > bottom) {
        doc.addPage()
        y = doc.page.margins.top
        drawHeaderRow(y)
        y += rowHeight
        doc.font('Helvetica').fontSize(10)
      }

      const valueMap = Object.fromEntries(point.values.map((v) => [v.dataColumnId, v.value]))
      const row = [
        point.label,
        ...record.columns.map((col) => {
          const val = valueMap[col.id]
          return val !== undefined ? String(val) : ''
        }),
      ]
      row.forEach((cell, i) => {
        doc.text(cell, left + i * colWidth, y, { width: colWidth - 6 })
      })
      y += rowHeight
    }

    doc.end()
  })
}

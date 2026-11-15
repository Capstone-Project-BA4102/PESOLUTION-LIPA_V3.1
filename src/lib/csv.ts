/** Download records as a UTF-8 CSV file (Excel-friendly BOM included). */
export function downloadCsv(filename: string, rows: Array<Record<string, string | number>>) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const cell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`
  const csv = [
    headers.map(cell).join(','),
    ...rows.map(row => headers.map(header => cell(row[header])).join(',')),
  ].join('\r\n')
  const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

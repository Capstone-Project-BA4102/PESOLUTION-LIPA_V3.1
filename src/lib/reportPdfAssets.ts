export type ReportPdfAssets = { normal: string; bold: string; logo?: string | null; previewLabel?: string }
let fonts: Promise<{ normal: string; bold: string }> | undefined
async function fontFile(name: string) {
  const response = await fetch(`${import.meta.env.BASE_URL}fonts/${name}`)
  if (!response.ok) throw new Error('The PDF font could not be loaded. Please retry.')
  const bytes = new Uint8Array(await response.arrayBuffer())
  let binary = ''
  for (let offset=0; offset<bytes.length; offset+=32768) binary += String.fromCharCode(...bytes.subarray(offset,offset+32768))
  return btoa(binary)
}
export async function pdfAssets(): Promise<ReportPdfAssets> {
  fonts ||= Promise.all([fontFile('LiberationSans-Regular.ttf'),fontFile('LiberationSans-Bold.ttf')]).then(([normal,bold])=>({normal,bold})).catch(error=>{ fonts=undefined; throw error })
  const loaded = await fonts
  let logo: string | null = null
  try {
    const image = new Image(); image.src = `${import.meta.env.BASE_URL}logo-lipa.png`; await image.decode()
    const canvas = document.createElement('canvas'); canvas.width=96; canvas.height=96
    canvas.getContext('2d')!.drawImage(image,0,0,96,96); logo=canvas.toDataURL('image/png')
  } catch { /* Text letterhead remains available if the seal cannot load. */ }
  return { ...loaded, logo }
}

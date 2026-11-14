import html2canvas from 'html2canvas-pro'
import { jsPDF } from 'jspdf'

/** Export the visible slip without opening another tab or changing referral records. */
export async function downloadReferralPdf(element: HTMLElement | null, referralNumber: string) {
  if (!element) throw new Error('The referral preview is not ready. Please try again.')
  const canvas = await html2canvas(element, {
    scale: 2, backgroundColor: '#ffffff', useCORS: true, windowWidth: 1280,
    // Keep the official document width stable even when downloaded from a narrow screen.
    onclone: document => {
      const slip = document.getElementById(element.id)
      if (slip) { slip.style.width = '1024px'; slip.style.maxWidth = 'none' }
    },
  })
  const image = canvas.toDataURL('image/jpeg', 0.95)
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
  const width = pdf.internal.pageSize.getWidth()
  const height = pdf.internal.pageSize.getHeight()
  const imageHeight = canvas.height * width / canvas.width
  for (let offset = 0; offset < imageHeight; offset += height) {
    if (offset > 0) pdf.addPage()
    pdf.addImage(image, 'JPEG', 0, -offset, width, imageHeight)
  }
  await pdf.save(`${referralNumber || 'referral'}.pdf`, { returnPromise: true })
}

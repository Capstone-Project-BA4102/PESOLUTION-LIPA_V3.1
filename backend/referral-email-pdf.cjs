const { jsPDF } = require('jspdf');
const { readFileSync } = require('node:fs');
const path = require('node:path');

// Server-owned attachment: never accept an arbitrary uploaded PDF for employer mail.
function referralPdf(record) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  for (const [file, style] of [['Regular', 'normal'], ['Bold', 'bold']]) {
    const name = `LiberationSans-${file}.ttf`;
    doc.addFileToVFS(name, readFileSync(path.join(__dirname, '../public/fonts', name)).toString('base64'));
    doc.addFont(name, 'LiberationSans', style);
  }
  doc.setFont('LiberationSans', 'normal');
  doc.setProperties({ title: `Referral slip ${record.number}`, author: 'PESO Lipa City' });
  doc.addImage(readFileSync(path.join(__dirname, '../public/logo-lipa.png')).toString('base64'), 'PNG', 40, 36, 52, 52);
  doc.setFontSize(14); doc.setFont('LiberationSans', 'bold');
  doc.text('PUBLIC EMPLOYMENT SERVICE OFFICE', 104, 50);
  doc.setFont('LiberationSans', 'normal'); doc.setFontSize(10);
  doc.text('City Government of Lipa', 104, 68);
  doc.text(doc.splitTextToSize('PESO Trabaho Center, 2nd Floor, Left Wing, New City Hall Building, Areza Estate, Barangay Bulacnin, Lipa City, Batangas', 440), 104, 83);
  doc.setDrawColor(201, 20, 27); doc.line(40, 124, 555, 124);
  doc.setFont('LiberationSans', 'bold'); doc.setFontSize(18); doc.text('REFERRAL SLIP', 40, 158);
  doc.setFont('LiberationSans', 'normal'); doc.setFontSize(11); doc.text(`No. ${record.number}`, 40, 180);
  let y = 214;
  const paragraph = (text, size = 11) => {
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(String(text || 'N/A'), 515);
    for (const line of lines) {
      if (y > 754) { doc.addPage(); y = 48; }
      doc.text(line, 40, y); y += size * 1.5;
    }
    y += 10;
  };
  paragraph(`Date: ${new Date(record.date).toLocaleDateString('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: 'long', day: 'numeric' })}`);
  paragraph(`To: ${record.recipientName}`);
  paragraph(`Address: ${record.address}`);
  paragraph('Dear Sir / Madam,');
  paragraph(`This is to respectfully refer to your good office the bearer, ${record.applicantName}, who has signified their intention to apply for the position of ${record.jobTitle} in your company.`);
  paragraph('Based on our initial assessment and matching process, the applicant possesses qualifications that align with your requirements. We hope you will find them suitable for employment in your esteemed organization.');
  paragraph('Please accommodate the applicant and let us know of the result of their application.');
  paragraph('Very truly yours,');
  y += 22; doc.setFont('LiberationSans', 'bold'); paragraph(record.signatory);
  doc.setFont('LiberationSans', 'normal'); paragraph('PESO Manager, City Government of Lipa', 10);
  paragraph(`Applicant contact: ${record.phone || 'N/A'}\nEmail: ${record.applicantEmail || 'N/A'}`, 10);
  return Buffer.from(doc.output('arraybuffer'));
}
module.exports = { referralPdf };

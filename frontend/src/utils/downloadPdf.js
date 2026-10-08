/**
 * Generates and downloads or previews a medical radiology report as a high-fidelity PDF
 * formatted according to diagnostic imaging standards.
 */

async function ensureHtml2Pdf() {
  if (typeof window.html2pdf === 'function') return true;

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="html2pdf"]');
    if (existing) {
      if (typeof window.html2pdf === 'function') return resolve(true);
      existing.onload = () => resolve(true);
      existing.onerror = reject;
      return;
    }
    const script = document.createElement('script');
    script.src = '/html2pdf.bundle.min.js';
    script.onload = () => resolve(true);
    script.onerror = reject;
    document.head.appendChild(script);
  }); 
}

function getPdfOptions(reportData) {
  const patientName = (reportData?.patientName || 'Patient').replace(/[^a-zA-Z0-9_-]/g, '_');
  const patientId = reportData?.patientId || reportData?.id || 'Report';
  const filename = `Radiology_Report_${patientName}_${patientId}.pdf`;

  return {
    margin: [8, 8, 8, 8],
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollY: 0
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait'
    },
    pagebreak: {
      mode: ['avoid-all', 'css', 'legacy']
    }
  };
}

export async function downloadReportPdf(reportData, elementId = 'report-viewer-content') {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Report content element not found:', elementId);
    window.print();
    return;
  }

  await ensureHtml2Pdf();

  if (typeof window.html2pdf !== 'function') {
    window.print();
    return;
  }

  const opt = getPdfOptions(reportData);
  return window.html2pdf().set(opt).from(element).save();
}

export async function openReportPdfInNewTab(reportData, elementId = 'report-viewer-content') {
  const element = document.getElementById(elementId);
  if (!element) {
    window.print();
    return;
  }

  await ensureHtml2Pdf();

  if (typeof window.html2pdf !== 'function') {
    window.print();
    return;
  }

  const opt = getPdfOptions(reportData);
  try {
    const pdfBlob = await window.html2pdf().set(opt).from(element).output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    window.open(blobUrl, '_blank');
  } catch (err) {
    console.error('Failed to open PDF in new tab:', err);
    window.print();
  }
}

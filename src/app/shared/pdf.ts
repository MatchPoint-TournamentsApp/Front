/** Exporta un elemento HTML a PDF (A4 o A3), ajustándolo a la página. Las librerías se cargan bajo demanda. */
export async function exportToPdf(el: HTMLElement, filename: string, size: 'a4' | 'a3' = 'a4') {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas-pro'), import('jspdf')]);
  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
  const landscape = canvas.width > canvas.height;
  const pdf = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'mm', format: size });
  const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight(), margin = 6;
  const ratio = Math.min((pw - margin * 2) / canvas.width, (ph - margin * 2) / canvas.height);
  const w = canvas.width * ratio, h = canvas.height * ratio;
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.93), 'JPEG', (pw - w) / 2, (ph - h) / 2, w, h);
  pdf.save(filename);
}

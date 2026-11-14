/** Captura un elemento HTML con html2canvas (se carga bajo demanda). */
async function capture(el: HTMLElement) {
  const { default: html2canvas } = await import('html2canvas-pro');
  return html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
}

/** Exporta un elemento HTML a PDF (A4 o A3), ajustándolo a la página. Las librerías se cargan bajo demanda. */
export async function exportToPdf(el: HTMLElement, filename: string, size: 'a4' | 'a3' = 'a4') {
  const [canvas, { jsPDF }] = await Promise.all([capture(el), import('jspdf')]);
  const landscape = canvas.width > canvas.height;
  const pdf = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'mm', format: size });
  const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight(), margin = 6;
  const ratio = Math.min((pw - margin * 2) / canvas.width, (ph - margin * 2) / canvas.height);
  const w = canvas.width * ratio, h = canvas.height * ratio;
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.93), 'JPEG', (pw - w) / 2, (ph - h) / 2, w, h);
  pdf.save(filename);
}

/** Exporta un elemento HTML a imagen PNG (nítida para compartir por WhatsApp o redes). */
export async function exportToPng(el: HTMLElement, filename: string) {
  const canvas = await capture(el);
  const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'));
  if (!blob) throw new Error('No se pudo crear la imagen');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

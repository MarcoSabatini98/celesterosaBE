'use strict';

// Generazione del PDF della fattura con pdf-lib (nessuna dipendenza di rete).
// Layout semplice e leggibile: intestazione cedente, dati cessionario, tabella
// righe con imponibile/IVA e riepilogo totali.
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const EUR = (n) =>
  `${Number(n).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

// invoice = record Invoice; items = InvoiceItem[]. Restituisce un Buffer.
async function buildInvoicePdf(invoice, items) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4 in punti
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;
  const dark = rgb(0.1, 0.1, 0.12);
  const grey = rgb(0.45, 0.45, 0.5);

  const text = (str, x, yy, { size = 10, f = font, color = dark } = {}) =>
    page.drawText(String(str ?? ''), { x, y: yy, size, font: f, color });

  // Intestazione
  text('FATTURA', margin, y, { size: 22, f: bold });
  text(`N. ${invoice.invoice_number}`, width - margin - 160, y + 6, { size: 11, f: bold });
  text(`Data: ${invoice.issue_date}`, width - margin - 160, y - 8, { size: 9, color: grey });
  y -= 40;

  // Cedente
  text('Cedente', margin, y, { size: 9, f: bold, color: grey });
  y -= 14;
  text(invoice.seller_name, margin, y, { f: bold });
  y -= 13;
  text(`P.IVA ${invoice.seller_vat}`, margin, y, { size: 9, color: grey });
  y -= 12;
  text(invoice.seller_address, margin, y, { size: 9, color: grey });

  // Cessionario
  let yc = y + 39;
  const cx = width / 2 + 10;
  text('Cessionario', cx, yc, { size: 9, f: bold, color: grey });
  yc -= 14;
  text(invoice.customer_name, cx, yc, { f: bold });
  yc -= 13;
  if (invoice.customer_vat) {
    text(`P.IVA ${invoice.customer_vat}`, cx, yc, { size: 9, color: grey });
    yc -= 12;
  }
  text(invoice.customer_email, cx, yc, { size: 9, color: grey });
  if (invoice.customer_address) {
    yc -= 12;
    text(invoice.customer_address, cx, yc, { size: 9, color: grey });
  }

  y -= 40;

  // Tabella righe
  const cols = { desc: margin, qty: 320, price: 370, vat: 440, total: 500 };
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: grey,
  });
  y -= 14;
  text('Descrizione', cols.desc, y, { size: 9, f: bold, color: grey });
  text('Q.tà', cols.qty, y, { size: 9, f: bold, color: grey });
  text('Imponib.', cols.price, y, { size: 9, f: bold, color: grey });
  text('IVA', cols.vat, y, { size: 9, f: bold, color: grey });
  text('Totale', cols.total, y, { size: 9, f: bold, color: grey });
  y -= 6;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 0.5,
    color: grey,
  });
  y -= 16;

  for (const it of items) {
    const desc = it.description.length > 48 ? `${it.description.slice(0, 47)}…` : it.description;
    text(desc, cols.desc, y, { size: 9 });
    text(it.quantity, cols.qty, y, { size: 9 });
    text(EUR(it.taxable_amount), cols.price, y, { size: 9 });
    text(EUR(it.vat_amount), cols.vat, y, { size: 9 });
    text(EUR(it.total_amount), cols.total, y, { size: 9 });
    y -= 16;
    if (y < 120) {
      y = height - margin;
      doc.addPage();
    }
  }

  // Riepilogo
  y -= 10;
  page.drawLine({
    start: { x: cols.price - 10, y },
    end: { x: width - margin, y },
    thickness: 0.5,
    color: grey,
  });
  y -= 16;
  const summary = (label, value, opts = {}) => {
    text(label, cols.vat - 40, y, { size: 9, color: grey, ...opts });
    text(EUR(value), cols.total, y, { size: 9, ...opts });
    y -= 15;
  };
  summary('Imponibile', invoice.taxable_total);
  summary('IVA', invoice.vat_total);
  summary('Totale', invoice.grand_total, { f: bold, size: 11 });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

module.exports = { buildInvoicePdf };

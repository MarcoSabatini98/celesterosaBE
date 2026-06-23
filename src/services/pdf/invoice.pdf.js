'use strict';

// Generazione PDF della fattura con pdf-lib. Layout A4: intestazione, dati
// cedente/cessionario, righe con imponibile e IVA, riepilogo totali.

const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const A4 = [595.28, 841.89];
const MARGIN = 50;
const DARK = rgb(0.1, 0.1, 0.12);
const GREY = rgb(0.4, 0.4, 0.45);
const LINE = rgb(0.8, 0.8, 0.83);

function euro(n) {
  return `€ ${Number(n).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function buildInvoicePdf(invoice, items) {
  const doc = await PDFDocument.create();
  const page = doc.addPage(A4);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = A4[0];
  let y = A4[1] - MARGIN;

  const text = (s, x, yy, { size = 10, f = font, color = DARK } = {}) =>
    page.drawText(String(s ?? ''), { x, y: yy, size, font: f, color });

  // Intestazione
  text('FATTURA', MARGIN, y, { size: 22, f: bold });
  text('celesterosa', W - MARGIN - 140, y, { size: 16, f: bold, color: rgb(0.55, 0.1, 0.3) });
  y -= 18;
  text('Strumenti musicali', W - MARGIN - 140, y, { size: 9, color: GREY });
  y -= 24;

  text(`Numero: ${invoice.invoice_number}`, MARGIN, y, { f: bold });
  text(`Data: ${invoice.issue_date}`, W - MARGIN - 140, y);
  y -= 28;

  // Cedente / Cessionario
  const colR = W / 2 + 10;
  text('CEDENTE', MARGIN, y, { size: 9, f: bold, color: GREY });
  text('CESSIONARIO', colR, y, { size: 9, f: bold, color: GREY });
  y -= 14;
  text(invoice.seller_name, MARGIN, y, { f: bold });
  text(invoice.customer_name, colR, y, { f: bold });
  y -= 13;
  text(`P.IVA ${invoice.seller_vat}`, MARGIN, y, { size: 9, color: GREY });
  if (invoice.customer_vat) text(`P.IVA ${invoice.customer_vat}`, colR, y, { size: 9, color: GREY });
  y -= 13;
  text(invoice.seller_address, MARGIN, y, { size: 9, color: GREY });
  if (invoice.customer_address) text(invoice.customer_address, colR, y, { size: 9, color: GREY });
  y -= 13;
  text(invoice.customer_email, colR, y, { size: 9, color: GREY });
  y -= 26;

  // Tabella righe
  const cols = { desc: MARGIN, qty: 300, unit: 340, imp: 410, iva: 470, tot: 515 };
  page.drawRectangle({ x: MARGIN, y: y - 4, width: W - 2 * MARGIN, height: 18, color: rgb(0.96, 0.96, 0.97) });
  text('Descrizione', cols.desc + 2, y, { size: 8, f: bold, color: GREY });
  text('Q.tà', cols.qty, y, { size: 8, f: bold, color: GREY });
  text('Prezzo', cols.unit, y, { size: 8, f: bold, color: GREY });
  text('Impon.', cols.imp, y, { size: 8, f: bold, color: GREY });
  text('IVA%', cols.iva, y, { size: 8, f: bold, color: GREY });
  text('Totale', cols.tot, y, { size: 8, f: bold, color: GREY });
  y -= 20;

  for (const it of items) {
    const desc = it.description.length > 52 ? `${it.description.slice(0, 49)}...` : it.description;
    text(desc, cols.desc + 2, y, { size: 9 });
    text(it.quantity, cols.qty, y, { size: 9 });
    text(euro(it.unit_price), cols.unit, y, { size: 8 });
    text(euro(it.taxable_amount), cols.imp, y, { size: 8 });
    text(`${Number(it.vat_rate)}%`, cols.iva, y, { size: 8 });
    text(euro(it.total_amount), cols.tot, y, { size: 8 });
    y -= 15;
    page.drawLine({ start: { x: MARGIN, y: y + 4 }, end: { x: W - MARGIN, y: y + 4 }, thickness: 0.5, color: LINE });
  }

  // Totali
  y -= 16;
  const tx = W - MARGIN - 200;
  const drawTotal = (label, val, b = false) => {
    text(label, tx, y, { size: b ? 11 : 9, f: b ? bold : font, color: b ? DARK : GREY });
    text(euro(val), W - MARGIN - 80, y, { size: b ? 11 : 9, f: b ? bold : font });
    y -= b ? 18 : 15;
  };
  drawTotal('Imponibile', invoice.taxable_total);
  drawTotal('IVA', invoice.vat_total);
  drawTotal('TOTALE', invoice.grand_total, true);

  // Footer
  text('Documento generato automaticamente da celesterosa.', MARGIN, MARGIN, { size: 8, color: GREY });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

module.exports = { buildInvoicePdf, euro };

'use strict';

// Invio email transazionali via nodemailer (SMTP sandbox in sviluppo).
// Gli errori di invio non devono bloccare il flusso applicativo: vengono
// loggati e l'invio fallito ritorna null.

const { getTransporter, mailFrom } = require('../config/mail');
const logger = require('../utils/logger');
const { euro } = require('./pdf/invoice.pdf');

async function sendMail({ to, subject, html, attachments }) {
  try {
    const info = await getTransporter().sendMail({ from: mailFrom, to, subject, html, attachments });
    logger.info(`Email inviata a ${to} (${subject}) — id ${info.messageId}`);
    return info;
  } catch (err) {
    logger.warn(`Invio email fallito (${subject} → ${to}): ${err.message}`);
    return null;
  }
}

function orderRows(order) {
  return order.items
    .map(
      (it) =>
        `<tr><td style="padding:4px 8px">${it.product_name}${it.variant_name ? ` – ${it.variant_name}` : ''}</td>` +
        `<td style="padding:4px 8px;text-align:center">${it.quantity}</td>` +
        `<td style="padding:4px 8px;text-align:right">${euro(it.line_total)}</td></tr>`,
    )
    .join('');
}

async function sendOrderConfirmation(order, invoice, pdfBuffer) {
  const html = `
    <div style="font-family:Arial,sans-serif;color:#1a1a1f;max-width:600px">
      <h2 style="color:#8c1a4d">Grazie per il tuo ordine!</h2>
      <p>Ciao ${order.shipping_recipient || ''}, abbiamo ricevuto il pagamento del tuo ordine
      <strong>${order.order_number}</strong>.</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0">
        <thead><tr style="background:#f4f4f6">
          <th style="padding:6px 8px;text-align:left">Articolo</th>
          <th style="padding:6px 8px">Q.tà</th>
          <th style="padding:6px 8px;text-align:right">Totale</th>
        </tr></thead>
        <tbody>${orderRows(order)}</tbody>
      </table>
      <p style="text-align:right">
        Imponibile: ${euro(order.subtotal)}<br/>
        IVA: ${euro(order.vat_total)}<br/>
        Spedizione: ${euro(order.shipping_total)}<br/>
        <strong style="font-size:16px">Totale: ${euro(order.grand_total)}</strong>
      </p>
      ${invoice ? `<p>In allegato la fattura <strong>${invoice.invoice_number}</strong>.</p>` : ''}
      <p style="color:#888;font-size:12px">celesterosa — Strumenti musicali</p>
    </div>`;

  const attachments = pdfBuffer
    ? [{ filename: `${invoice.invoice_number.replace(/\//g, '-')}.pdf`, content: pdfBuffer }]
    : [];

  return sendMail({ to: order.email, subject: `Conferma ordine ${order.order_number}`, html, attachments });
}

async function sendShippingNotification(order) {
  const html = `
    <div style="font-family:Arial,sans-serif;color:#1a1a1f">
      <h2 style="color:#8c1a4d">Il tuo ordine è in viaggio</h2>
      <p>L'ordine <strong>${order.order_number}</strong> è stato spedito a:</p>
      <p>${order.shipping_recipient}<br/>${order.shipping_line1}<br/>
      ${order.shipping_postal_code} ${order.shipping_city} (${order.shipping_province || ''})</p>
    </div>`;
  return sendMail({ to: order.email, subject: `Ordine ${order.order_number} spedito`, html });
}

module.exports = { sendOrderConfirmation, sendShippingNotification };

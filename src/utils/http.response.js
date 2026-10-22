'use strict';

// Helper per response in formato JSend (https://github.com/omniti-labs/jsend).
//   - 'success' → 2xx, payload in `data`
//   - 'fail'    → 4xx, errore client, contesto in `data`
//   - 'error'   → 5xx, errore server, messaggio in `message`

function sendSuccess(res, statusCode, data) {
  const payload =
    data != null && typeof data === 'object' && typeof data.toJSON === 'function'
      ? data.toJSON()
      : data;
  return res.status(statusCode).json({ status: 'success', data: payload ?? null });
}

function sendFail(res, statusCode, data) {
  const payload = typeof data === 'string' ? { message: data } : data;
  return res.status(statusCode).json({
    status: 'fail',
    message: payload?.message,
    data: payload ?? null,
  });
}

function sendError(res, statusCode, message, extra) {
  return res.status(statusCode).json({
    status: 'error',
    message,
    ...(extra ? { data: extra } : {}),
  });
}

module.exports = { sendSuccess, sendFail, sendError };

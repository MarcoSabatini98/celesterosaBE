'use strict';

// Helper di paginazione. parsePagination normalizza page/limit (con limiti di
// sicurezza) e calcola l'offset per Sequelize; toPaginated costruisce la forma
// `Paginated<T>` attesa dal frontend.

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// page/limit possono arrivare come stringhe dalla query string.
function parsePagination(query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const rawLimit = Number.parseInt(query.limit, 10) || DEFAULT_LIMIT;
  const limit = Math.min(MAX_LIMIT, Math.max(1, rawLimit));
  return { page, limit, offset: (page - 1) * limit };
}

// rows = elementi (già serializzati), count = totale assoluto dal DB.
function toPaginated(rows, count, { page, limit }) {
  return {
    items: rows,
    page,
    limit,
    total: count,
    total_pages: Math.max(1, Math.ceil(count / limit)),
  };
}

module.exports = { parsePagination, toPaginated, DEFAULT_LIMIT, MAX_LIMIT };

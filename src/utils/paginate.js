'use strict';

// Normalizza i parametri di paginazione da query string (sempre stringhe) in
// interi entro limiti sicuri, evitando valori non numerici nelle query SQL.
function parsePageParams(query = {}, { defLimit = 20, maxLimit = 100 } = {}) {
  const p = parseInt(query.page, 10);
  const l = parseInt(query.limit, 10);
  const page = Number.isNaN(p) ? 1 : Math.max(1, p);
  const limit = Number.isNaN(l) ? defLimit : Math.min(maxLimit, Math.max(1, l));
  return { page, limit };
}

// Forma di risposta paginata condivisa da tutti i listing. `rows`/`count`
// arrivano da Sequelize.findAndCountAll; `mapper` serializza ogni elemento.
function paginate(rows, count, page, limit, mapper = (x) => x) {
  return {
    items: rows.map(mapper),
    page,
    limit,
    total: count,
    total_pages: Math.ceil(count / limit) || 1,
  };
}

module.exports = { paginate, parsePageParams };

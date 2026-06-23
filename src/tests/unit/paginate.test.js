'use strict';

const { paginate, parsePageParams } = require('../../utils/paginate');

describe('paginate.parsePageParams', () => {
  it('coerce le stringhe in interi', () => {
    expect(parsePageParams({ page: '2', limit: '5' })).toEqual({ page: 2, limit: 5 });
  });

  it('applica i default su valori mancanti o non validi', () => {
    expect(parsePageParams({})).toEqual({ page: 1, limit: 20 });
    expect(parsePageParams({ page: 'abc', limit: 'x' })).toEqual({ page: 1, limit: 20 });
  });

  it('rispetta i limiti minimi e massimi', () => {
    expect(parsePageParams({ page: '0', limit: '0' })).toEqual({ page: 1, limit: 1 });
    expect(parsePageParams({ limit: '999' }, { maxLimit: 60 }).limit).toBe(60);
  });
});

describe('paginate.paginate', () => {
  it('costruisce la risposta paginata con mapper', () => {
    const rows = [{ id: 1 }, { id: 2 }];
    const res = paginate(rows, 7, 2, 2, (r) => r.id);
    expect(res).toEqual({ items: [1, 2], page: 2, limit: 2, total: 7, total_pages: 4 });
  });

  it('total_pages è almeno 1 con zero risultati', () => {
    expect(paginate([], 0, 1, 10).total_pages).toBe(1);
  });
});

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { contarAtivas, decidir, sincronizar, clienteN8n } = require('./gate');

function clienteSimulado(publicadoInicial) {
  const log = [];
  let publicado = publicadoInicial;
  return {
    log,
    async executorPublicado() { log.push('consulta'); return publicado; },
    async publicar() { log.push('publicar'); publicado = true; },
    async despublicar() { log.push('despublicar'); publicado = false; }
  };
}

test('conta só automações ativas', () => {
  assert.equal(contarAtivas([{ ativo: true }, { ativo: false }, { ativo: 'true' }, null]), 2);
  assert.equal(contarAtivas([]), 0);
});

test('decisão nos quatro casos', () => {
  assert.equal(decidir({ ativas: 1, executorPublicado: false }), 'publicar');
  assert.equal(decidir({ ativas: 0, executorPublicado: true }), 'despublicar');
  assert.equal(decidir({ ativas: 3, executorPublicado: true }), 'manter');
  assert.equal(decidir({ ativas: 0, executorPublicado: false }), 'manter');
});

test('tabela vazia (situação de hoje): despublica o executor', async () => {
  const c = clienteSimulado(true);
  const r = await sincronizar({ linhas: [], cliente: c });
  assert.equal(r.acao, 'despublicar');
  assert.deepEqual(c.log, ['consulta', 'despublicar']);
});

test('primeira automação salva: publica de novo (promessa de 5 min mantida)', async () => {
  const c = clienteSimulado(false);
  const r = await sincronizar({ linhas: [{ nome: 'sala 22h', ativo: true }], cliente: c });
  assert.equal(r.acao, 'publicar');
  assert.deepEqual(c.log, ['consulta', 'publicar']);
});

test('automação pausada não mantém o executor ligado', async () => {
  const c = clienteSimulado(true);
  const r = await sincronizar({ linhas: [{ nome: 'x', ativo: false }], cliente: c });
  assert.equal(r.acao, 'despublicar');
});

test('cliente real recusa rodar sem chave', () => {
  assert.throws(() => clienteN8n({ baseUrl: 'https://exemplo.invalid/api/v1', chave: '' }), /chave da API do n8n/);
});

test('cliente real chama as rotas certas (fetch simulado)', async () => {
  const chamadas = [];
  const fetchFn = async (url, opt = {}) => { chamadas.push((opt.method || 'GET') + ' ' + url); return { ok: true, json: async () => ({ active: true }) }; };
  const c = clienteN8n({ baseUrl: 'https://n8n.exemplo/api/v1', chave: 'FALSA', fetchFn });
  const r = await sincronizar({ linhas: [], cliente: c, executorId: 'ID' });
  assert.equal(r.acao, 'despublicar');
  assert.deepEqual(chamadas, ['GET https://n8n.exemplo/api/v1/workflows/ID', 'POST https://n8n.exemplo/api/v1/workflows/ID/deactivate']);
});

test('economia estimada: tabela vazia o mês todo', () => {
  const porDia = 24 * 60 / 5; // 288 execuções/dia do executor
  assert.equal(porDia * 30, 8640);
});

'use strict';
// Testes só com páginas fictícias (fixtures/), servidas localmente. Nenhum site real é acessado.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const A = require('../adaptadores');

const fx = (nome, q = '') => pathToFileURL(path.join(__dirname, '..', 'fixtures', nome)).href + q;
let browser, page;
test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser.close(); });
test.beforeEach(async () => { page = await browser.newPage(); });
test.afterEach(async () => { await page.close(); });

test('modo real sem confirmação é bloqueado', async () => {
  await assert.rejects(A.criarEmailICloud(page, { url: fx('icloud.html'), endereco: 'a@b.test', modo: 'real' }), /Execução real bloqueada/);
});

test('e-mail: simulação conclui com evidência', async () => {
  const r = await A.criarEmailICloud(page, { url: fx('icloud.html'), endereco: 'cliente.teste@dominio-ficticio.test' });
  assert.equal(r.resultado, 'concluido');
  assert.match(r.evidencia, /cliente.teste@dominio-ficticio.test/);
});

test('e-mail: modo real para antes do clique final', async () => {
  const r = await A.criarEmailICloud(page, { url: fx('icloud.html'), endereco: 'x@dominio-ficticio.test', modo: 'real', confirmacaoReal: 'SIM, CONTA REAL' });
  assert.equal(r.resultado, 'pronto_para_enviar');
  assert.equal(await page.locator('[data-estado="adicionado"]').count(), 0);
});

test('e-mail: limite do domínio', async () => {
  const r = await A.criarEmailICloud(page, { url: fx('icloud.html', '?limite=1'), endereco: 'x@dominio-ficticio.test' });
  assert.equal(r.resultado, 'erro');
});

test('e-mail inválido é recusado sem abrir página', async () => {
  const r = await A.criarEmailICloud(page, { url: fx('icloud.html'), endereco: 'sem-arroba' });
  assert.equal(r.resultado, 'erro');
});

test('Amazon: para na senha (operador digita)', async () => {
  const r = await A.criarContaAmazon(page, { url: fx('amazon.html'), email: 'c@dominio-ficticio.test', nome: 'Cliente Teste' });
  assert.equal(r.resultado, 'precisa_operador');
  assert.equal(await page.locator('input[type=password]').inputValue(), '');
});

test('Amazon: telefone obrigatório interrompe', async () => {
  const r = await A.criarContaAmazon(page, { url: fx('amazon.html', '?telefone=obrigatorio'), email: 'c@dominio-ficticio.test', nome: 'Cliente Teste' });
  assert.equal(r.resultado, 'exige_telefone');
});

test('Amazon: telefone com "Agora não" é pulado, nada preenchido', async () => {
  const r = await A.criarContaAmazon(page, { url: fx('amazon.html', '?telefone=pular'), email: 'c@dominio-ficticio.test', nome: 'Cliente Teste' });
  assert.equal(r.resultado, 'precisa_operador');
});

test('Amazon: CAPTCHA na entrada e depois do e-mail', async () => {
  assert.equal((await A.criarContaAmazon(page, { url: fx('amazon.html', '?captcha=entrada'), email: 'c@d.test', nome: 'Cliente Teste' })).resultado, 'intervencao');
  assert.equal((await A.criarContaAmazon(page, { url: fx('amazon.html', '?captcha=depois'), email: 'c@d.test', nome: 'Cliente Teste' })).resultado, 'intervencao');
});

test('Amazon: código de verificação', async () => {
  const r = await A.criarContaAmazon(page, { url: fx('amazon.html', '?codigo=1'), email: 'c@dominio-ficticio.test', nome: 'Cliente Teste' });
  assert.equal(r.resultado, 'aguardando_codigo');
});

test('Vinci: roteiro para o Android sem telefone', () => {
  const r = A.roteiroContaVinci({ email: 'c@dominio-ficticio.test' });
  assert.equal(r.resultado, 'precisa_operador');
  assert.ok(r.passos.some((p) => /não usar telefone/.test(p)));
});

test('nenhum adaptador tem campo de telefone para preencher', () => {
  const src = require('node:fs').readFileSync(path.join(__dirname, '..', 'adaptadores.js'), 'utf8');
  assert.doesNotMatch(src, /\.fill\([^)]*(tel|phone|telefone)/i);
});

// Ponte Alexa do Jarvis — expõe a casa cadastrada na Alexa como uma API simples para o n8n.
// Baseado em alexa-remote2 (Apollon77). Login: abrir http://localhost:3001 no Mac e entrar na conta Amazon.
// Cópia de referência do arquivo que roda no Mac Mini em ~/jarvis-alexa-ponte/server.js (config.json e cookies ficam só lá).
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const Alexa = require('alexa-remote2');

const DIR = __dirname;
const CFG_FILE = path.join(DIR, 'config.json');
const COOKIE_FILE = path.join(DIR, 'alexa-cookie.json');
const LOG_FILE = path.join(DIR, 'ponte.log');

let cfg = {};
try { cfg = JSON.parse(fs.readFileSync(CFG_FILE, 'utf8')); } catch (e) {}
cfg.token = cfg.token || crypto.randomBytes(18).toString('hex');
cfg.apiPort = cfg.apiPort || 3456;
cfg.proxyPort = cfg.proxyPort || 3001;
cfg.amazonPage = cfg.amazonPage || 'amazon.com.br';
cfg.echoPadrao = cfg.echoPadrao || '';
fs.writeFileSync(CFG_FILE, JSON.stringify(cfg, null, 2));

const log = (...a) => { const l = new Date().toISOString() + ' ' + a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); console.log(l); try { fs.appendFileSync(LOG_FILE, l + '\n'); } catch (e) {} };

let cookieData = null;
try { cookieData = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf8')); } catch (e) {}

const alexa = new Alexa();
let pronto = false, erroLogin = null;

alexa.on('cookie', () => {
  try { fs.writeFileSync(COOKIE_FILE, JSON.stringify(alexa.cookieData)); log('Cookie da Amazon salvo/atualizado.'); } catch (e) { log('Falha ao salvar cookie', e.message); }
});

function iniciarAlexa() {
  alexa.init({
    cookie: cookieData || undefined,
    formerRegistrationData: cookieData || undefined,
    proxyOnly: true,
    proxyOwnIp: 'localhost',
    proxyPort: cfg.proxyPort,
    proxyLogLevel: 'warn',
    amazonPage: cfg.amazonPage,
    acceptLanguage: 'pt-BR',
    useWsMqtt: false,
    cookieRefreshInterval: 4 * 24 * 60 * 60 * 1000,
    logger: (m) => { if (/proxy|Proxy|login|Login|error|Error/.test(String(m))) log(String(m).slice(0, 300)); }
  }, (err) => {
    if (err) {
      erroLogin = String(err.message || err);
      if (/proxy/i.test(erroLogin) || /open/i.test(erroLogin)) log('>>> Abra http://localhost:' + cfg.proxyPort + ' no navegador deste Mac e entre na sua conta Amazon.');
      else log('Erro ao iniciar Alexa:', erroLogin);
      return;
    }
    pronto = true; erroLogin = null;
    try { if (alexa.cookieData) fs.writeFileSync(COOKIE_FILE, JSON.stringify(alexa.cookieData)); } catch (e) {}
    log('Alexa conectada. Echos encontrados: ' + Object.keys(alexa.serialNumbers || {}).length);
  });
}
iniciarAlexa();

// ---------- utilidades ----------
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const p = (fn, ...args) => new Promise((ok, fail) => fn.call(alexa, ...args, (err, res) => err ? fail(err) : ok(res)));

let cacheDisp = { t: 0, itens: [] };
async function dispositivos(forcar) {
  if (!forcar && Date.now() - cacheDisp.t < 5 * 60 * 1000 && cacheDisp.itens.length) return cacheDisp.itens;
  const items = await p(alexa.getSmarthomeDevicesV2);
  const out = [];
  for (const d of items) {
    const la = d.legacyAppliance || {};
    if (!la.entityId && !la.applianceId) continue;
    const tipo = (d.displayCategories && d.displayCategories.primary && d.displayCategories.primary.value) || (la.applianceTypes || [])[0] || '';
    if (/ALEXA_VOICE_ENABLED|SPEAKER|PHONE|TABLET/i.test(tipo) && !(la.actions || []).includes('turnOn')) continue;
    let caps = la.capabilities || [];
    if (typeof caps === 'string') { try { caps = JSON.parse(caps); } catch (e) { caps = []; } }
    const acoes = [...new Set([...(la.actions || []), ...caps.map(c => (c && (c.interfaceName || c.interface)) || '').filter(Boolean).map(x => x.replace('Alexa.', ''))])];
    const nomeTipo = tipo === 'ACTIVITY_TRIGGER' || tipo === 'SCENE_TRIGGER' ? 'CENA' : tipo;
    const nome = d.friendlyName || la.friendlyName;
    if (out.some(o => o.nome === nome && o.tipo === nomeTipo)) continue; // duplicados
    // cena: a Amazon diz se ela aceita 'desativar' (supportsDeactivation). Cenas Tuya/Smart Life costumam ser só de disparo.
    const sc = caps.find(c => c && /SceneController/.test(String(c.interfaceName || c.interface || '')));
    const desativavel = nomeTipo === 'CENA' ? !!(sc && sc.supportsDeactivation === true) : undefined;
    out.push({ nome, id: la.entityId || la.applianceId, tipo: nomeTipo, fabricante: la.manufacturerName || '', acoes, desativavel, apelidos: (la.aliases || []).map(a => a.friendlyName || a).filter(Boolean) });
  }
  cacheDisp = { t: Date.now(), itens: out };
  return out;
}
function acharPorNome(lista, nome) {
  const n = norm(nome);
  return lista.find(d => norm(d.nome) === n) || lista.find(d => (d.apelidos || []).some(a => norm(a) === n))
      || lista.find(d => norm(d.nome).includes(n)) || lista.find(d => n.includes(norm(d.nome)));
}
function echos() {
  return Object.values(alexa.serialNumbers || {}).filter(d => d.capabilities && d.capabilities.includes('VOLUME_SETTING'))
    .map(d => ({ nome: d.accountName, serial: d.serialNumber, online: d.online }));
}
function escolherEcho(nome) {
  const lista = echos();
  if (!lista.length) throw new Error('Nenhum Echo encontrado na conta.');
  const alvo = nome || cfg.echoPadrao;
  if (alvo) { const n = norm(alvo); const e = lista.find(x => norm(x.nome) === n) || lista.find(x => norm(x.nome).includes(n)); if (e) return e; }
  return lista.find(x => x.online) || lista[0];
}
const ACAO = {
  ligar: () => ({ action: 'turnOn' }),
  desligar: () => ({ action: 'turnOff' }),
  brilho: (v) => ({ action: 'setBrightness', brightness: Math.max(0, Math.min(100, Number(v))) }),
  porcentagem: (v) => ({ action: 'setPercentage', percentage: Math.max(0, Math.min(100, Number(v))) }),
  cor: (v) => ({ action: 'setColor', colorName: String(v || 'white').toLowerCase() }),
  temperatura: (v) => ({ action: 'setTargetTemperature', 'targetTemperature.value': Number(v), 'targetTemperature.scale': 'celsius' }),
  trancar: () => ({ action: 'lockAction', targetLockState: { value: 'LOCKED' } }),
  ativar: () => ({ action: 'sceneActivate' }),
  desativar: () => ({ action: 'sceneDeactivate' }),
};

// ---------- API ----------
function lerCorpo(req) {
  return new Promise((ok) => { let b = ''; req.on('data', c => b += c); req.on('end', () => { try { ok(b ? JSON.parse(b) : {}); } catch (e) { ok({}); } }); });
}
function responder(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); }

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/' ) return responder(res, 200, { ponte: 'alexa', pronto });
  if (req.headers['x-ponte-token'] !== cfg.token) return responder(res, 401, { erro: 'token inválido' });
  if (!pronto && url.pathname !== '/status') return responder(res, 503, { erro: 'Alexa ainda não conectada. Faça o login em http://localhost:' + cfg.proxyPort + ' no Mac da ponte.', detalhe: erroLogin });
  try {
    const body = req.method === 'POST' ? await lerCorpo(req) : {};
    switch (url.pathname) {
      case '/status':
        return responder(res, 200, { pronto, erroLogin, echos: pronto ? echos() : [] });
      case '/dispositivos': {
        const lista = await dispositivos(url.searchParams.get('atualizar') === '1');
        return responder(res, 200, { total: lista.length, dispositivos: lista.map(d => ({ nome: d.nome, tipo: d.tipo, acoes: d.acoes, desativavel: d.desativavel, fabricante: d.fabricante })) });
      }
      case '/acao': {
        const lista = await dispositivos();
        const alvo = body.id ? lista.find(d => d.id === body.id) : acharPorNome(lista, body.dispositivo || body.nome);
        if (!alvo) return responder(res, 404, { erro: 'Dispositivo não encontrado: ' + (body.dispositivo || body.nome), sugestao: 'Use /dispositivos para ver os nomes.' });
        const f = ACAO[norm(body.acao)];
        if (!f) return responder(res, 400, { erro: 'Ação inválida. Use: ' + Object.keys(ACAO).join(', ') });
        const r = await p(alexa.executeSmarthomeDeviceAction, [alvo.id], f(body.valor), 'APPLIANCE');
        const erros = (r && r.errors) || [];
        log('acao', alvo.nome, body.acao, body.valor || '', erros.length ? erros : 'ok');
        if (erros.length) return responder(res, 502, { ok: false, dispositivo: alvo.nome, erro: erros[0].code || 'erro', detalhe: erros });
        return responder(res, 200, { ok: true, dispositivo: alvo.nome, acao: body.acao, valor: body.valor });
      }
      case '/comando': { // frase falada para a Alexa executar (cenas, rotinas, qualquer coisa que ela entenda)
        const texto = String(body.texto || '').trim();
        if (!texto) return responder(res, 400, { erro: 'texto vazio' });
        const echo = escolherEcho(body.echo);
        await p(alexa.sendSequenceCommand, echo.serial, 'textCommand', texto);
        log('comando', echo.nome, texto);
        return responder(res, 200, { ok: true, echo: echo.nome, texto });
      }
      case '/falar': {
        const texto = String(body.texto || '').trim();
        if (!texto) return responder(res, 400, { erro: 'texto vazio' });
        const echo = escolherEcho(body.echo);
        await p(alexa.sendSequenceCommand, echo.serial, 'speak', texto);
        return responder(res, 200, { ok: true, echo: echo.nome });
      }
      case '/bruto': { // diagnóstico: entrada crua da Amazon para um nome
        const items = await p(alexa.getSmarthomeDevicesV2);
        const n = norm(url.searchParams.get('nome') || '');
        const achados = items.filter(d => norm(d.friendlyName || (d.legacyAppliance || {}).friendlyName) === n);
        return responder(res, 200, { total: achados.length, itens: achados });
      }
      case '/rotinas': {
        const r = await p(alexa.getAutomationRoutines, 200);
        return responder(res, 200, { rotinas: (r || []).map(x => x.name).filter(Boolean) });
      }
      case '/rotina': {
        const r = await p(alexa.getAutomationRoutines, 200);
        const n = norm(body.nome);
        const rot = (r || []).find(x => norm(x.name) === n) || (r || []).find(x => norm(x.name).includes(n));
        if (!rot) return responder(res, 404, { erro: 'Rotina não encontrada: ' + body.nome });
        const echo = escolherEcho(body.echo);
        await p(alexa.executeAutomationRoutine, echo.serial, rot);
        log('rotina', rot.name);
        return responder(res, 200, { ok: true, rotina: rot.name });
      }
      default:
        return responder(res, 404, { erro: 'rota desconhecida', rotas: ['/status', '/dispositivos', '/acao', '/comando', '/falar', '/bruto', '/rotinas', '/rotina'] });
    }
  } catch (e) {
    log('erro', url.pathname, String(e && e.message || e));
    return responder(res, 500, { erro: String(e && e.message || e) });
  }
});
server.listen(cfg.apiPort, () => log('Ponte Alexa ouvindo na porta ' + cfg.apiPort));

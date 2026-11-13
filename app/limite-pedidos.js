/* Limite de pedidos ao n8n (ordem do Leandro, 13/11/2026): no máximo 5 vezes por minuto para a mesma requisição.
   Vale para Felyx e Leda. A conta fica no aparelho (localStorage), então nem recarregar a página em laço passa do limite.
   Pedido acima do limite não sai: a página recebe na hora uma resposta 429 { ok:false, limite:true } e trata como falha comum. */
(function(){
  if (window.__limitePedidos) return; window.__limitePedidos = true;
  const original = window.fetch && window.fetch.bind(window);
  if (!original) return;
  const LIMITE = 5, JANELA = 60000, CHAVE = 'vinci.limitePedidos';
  let memoria = {};
  const ler = () => { try { return JSON.parse(localStorage.getItem(CHAVE) || '{}') || {}; } catch (e) { return memoria; } };
  const gravar = (o) => { memoria = o; try { localStorage.setItem(CHAVE, JSON.stringify(o)); } catch (e) {} };
  const resumo = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
  window.fetch = function(entrada, op){
    let u;
    try { u = new URL(typeof entrada === 'string' ? entrada : (entrada && entrada.url) || String(entrada), location.href); } catch (e) { return original(entrada, op); }
    if (!/\.n8n\.cloud$/.test(u.hostname)) return original(entrada, op);
    const metodo = String((op && op.method) || (entrada && entrada.method) || 'GET').toUpperCase();
    const corpo = op && typeof op.body === 'string' ? op.body : '';
    const chave = metodo + ' ' + u.pathname + u.search + (corpo ? ' #' + resumo(corpo) : '');
    const agora = Date.now(), tudo = ler();
    for (const k in tudo) { tudo[k] = (tudo[k] || []).filter((t) => agora - t < JANELA); if (!tudo[k].length) delete tudo[k]; }
    const lista = tudo[chave] || [];
    if (lista.length >= LIMITE) {
      gravar(tudo);
      try { console.warn('limite de pedidos: ' + metodo + ' ' + u.pathname + ' (5 por minuto)'); } catch (e) {}
      return Promise.resolve(new Response(JSON.stringify({ ok: false, limite: true, mensagem: 'Muitos pedidos iguais em pouco tempo. Tente de novo em um minuto.' }), { status: 429, headers: { 'Content-Type': 'application/json' } }));
    }
    lista.push(agora); tudo[chave] = lista; gravar(tudo);
    return original(entrada, op);
  };
})();

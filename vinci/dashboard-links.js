/* Tudo do dashboard é clicável (Felyx, Leda e Leo) — 25/11/2026, ordem do Leandro.
   Cotação abre o par na Binance; receita abre a receita num site de receitas; notícia já abre a matéria.
   Não mexe em nada do controle da casa (cenas e aparelhos). */
(function(){
  'use strict';
  const BINANCE = {
    usd: 'https://www.binance.com/pt-BR/trade/USDT_BRL',
    eur: 'https://www.binance.com/pt-BR/trade/EUR_USDT',
    btc: 'https://www.binance.com/pt-BR/trade/BTC_USDT',
    eth: 'https://www.binance.com/pt-BR/trade/ETH_USDT',
    sol: 'https://www.binance.com/pt-BR/trade/SOL_USDT',
    zec: 'https://www.binance.com/pt-BR/trade/ZEC_USDT',
    oil: 'https://www.binance.com/pt-BR/futures/CLUSDT'
  };
  const abrir = (u) => { try{ window.open(u, '_blank', 'noopener'); }catch(e){ location.href = u; } };
  const css = document.createElement('style');
  css.textContent = '#marketRows .row{cursor:pointer}#marketRows .row:active{opacity:.7}.rcCard h3{cursor:pointer}';
  document.head.appendChild(css);
  document.addEventListener('click', (e) => {
    const row = e.target.closest && e.target.closest('#marketRows .row');
    if(row){ const u = BINANCE[row.dataset.id]; if(u){ abrir(u); } return; }
    const card = e.target.closest && e.target.closest('.rcCard');
    if(card && !e.target.closest('button')){
      const nome = (card.querySelector('h3') || {}).textContent || '';
      const tipo = ((card.querySelector('small') || {}).textContent || '').toLowerCase();
      if(!nome.trim()) return;
      const receita = /doce|salgado|receita/.test(tipo);
      abrir(receita ? 'https://www.tudogostoso.com.br/busca?q=' + encodeURIComponent(nome.trim())
                    : 'https://www.google.com/search?q=' + encodeURIComponent(nome.trim()));
    }
  }, true);
})();

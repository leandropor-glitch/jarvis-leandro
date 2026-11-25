/* NEXT UPDATE 25/11/2026 (Leandro): a casa como está no Google Link.
   1) Nomes de cena "de engenharia" ganham apelido na tela (o nome mandado para a casa não muda).
   2) Aparelhos com nome técnico, que não estão no Google Link da casa, não aparecem na lista.
   Não mexe no acionamento: só no texto mostrado e na lista de escolha. */
(function(){
  'use strict';
  const APELIDOS = {
    'OffautACSala': 'Ar da sala: desligar automático', 'ONAutACSala': 'Ar da sala: ligar automático',
    'Cont aoff TV Suite': 'TV da suíte: desligar', 'Cont OnTV Suíte': 'TV da suíte: ligar',
    'Vol+ Z1': 'Volume + sala', 'Vol Z1': 'Volume sala', 'Vol SM': 'Volume suíte',
    '3wBM': 'Banheiro master', 'CH': 'Chuveiro', 'PW Z1': 'Som da sala', 'PW Z2': 'Som zona 2', 'PW Net': 'Internet',
    'MudoSM': 'Mudo suíte', 'CortDir': 'Cortina direita', 'OFF_Sala': 'Desligar sala', 'OFF Sala': 'Desligar sala'
  };
  const TECNICOS = /^(Switch \d+|Restart\d+s?|backlight switch|Cozinha switch \d+|Cab Leandro switch \d+|Interruptor desconhecido|Fita \d+|Ar)$/i;
  const nomeDe = (el) => (el.dataset.nomeOriginal || el.textContent || '').trim();
  function aplicar(){
    document.querySelectorAll('.tile span').forEach(s => {
      const n = nomeDe(s);
      if(APELIDOS[n] && s.textContent.trim() === n){ s.dataset.nomeOriginal = n; s.textContent = APELIDOS[n]; s.title = n; }
    });
    document.querySelectorAll('.tile').forEach(t => {
      const s = t.querySelector('span'); const n = s ? nomeDe(s) : '';
      if(TECNICOS.test(n)) t.style.display = 'none';
    });
    try{ if(typeof casaGen !== 'undefined' && Array.isArray(casaGen.aparelhos)){ const f = casaGen.aparelhos.filter(n => !TECNICOS.test(String(n).trim())); if(f.length !== casaGen.aparelhos.length) casaGen.aparelhos = f; } }catch(e){}
  }
  let ag = 0; const agendar = () => { if(!ag) ag = requestAnimationFrame(() => { ag = 0; aplicar(); }); };
  function iniciar(){ aplicar(); new MutationObserver(agendar).observe(document.body, { childList: true, subtree: true, characterData: true }); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();

// Regra do cumprimento (Lite, PRO, FULL e app): o "bom dia / boa tarde / boa noite" completo — com mercado, dólar e
// notícias — sai no máximo uma vez a cada 4 horas. Dentro desse intervalo o Felyx só devolve um cumprimento curto.
// A marca fica no localStorage do domínio, então vale para todas as versões abertas neste aparelho.
(function () {
  const CHAVE = 'felyx_cumprimento_completo', INTERVALO = 4 * 60 * 60 * 1000;
  const SAUDACAO = /\b(bom\s*dia|boa\s*tarde|boa\s*noite)\b/i;
  function ultimo() { try { return Number(localStorage.getItem(CHAVE) || 0); } catch (e) { return 0; } }
  const felyxCumprimento = {
    recente: () => Date.now() - ultimo() < INTERVALO,
    marcar: () => { try { localStorage.setItem(CHAVE, String(Date.now())); } catch (e) {} },
    agoraMesmo: () => Date.now() - ultimo() < 8000,   // o completo acabou de ser liberado (para acender os cards)
    ehSaudacao: (texto) => SAUDACAO.test(String(texto || '')),
    // pergunta que vai para o cérebro: se for só um cumprimento e já houve o completo há pouco, pede resposta curta
    ajustar(pergunta) {
      if (!this.ehSaudacao(pergunta)) return pergunta;
      if (this.recente()) return pergunta + ' (Instrução do sistema: já houve um cumprimento completo há menos de 4 horas. Responda só com um cumprimento curto e cordial, sem mercado, dólar, bolsa, cotações nem notícias.)';
      this.marcar();
      return pergunta;
    },
  };
  window.felyxCumprimento = felyxCumprimento;
})();

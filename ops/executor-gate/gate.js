// Opção A (proposta, NÃO ativada): o executor de automações do Félix só fica publicado
// enquanto houver ao menos uma automação ativa. A regra "até 5 minutos" não muda:
// com automação, o executor roda a cada 5 min como hoje; sem automação, não roda e não gasta execução.
//
// Este módulo só decide e chama um cliente da API do n8n recebido de fora.
// Em produção o cliente usa a API pública do n8n (precisa de chave criada pelo Leandro);
// nos testes o cliente é simulado. Nenhuma chave fica neste repositório.

'use strict';

const EXECUTOR_ID = 'z6IB7BOhuPt01DUe'; // "Felyx — executor de automações"

/** Conta automações ativas (linhas com ativo === true). */
function contarAtivas(linhas) {
  return (linhas || []).filter((l) => l && (l.ativo === true || l.ativo === 'true')).length;
}

/**
 * Decide o que fazer com o executor.
 * @returns {'publicar'|'despublicar'|'manter'}
 */
function decidir({ ativas, executorPublicado }) {
  if (ativas > 0 && !executorPublicado) return 'publicar';
  if (ativas === 0 && executorPublicado) return 'despublicar';
  return 'manter';
}

/**
 * Aplica a decisão usando o cliente da API.
 * cliente: { executorPublicado(id): Promise<boolean>, publicar(id): Promise<void>, despublicar(id): Promise<void> }
 * Retorna um registro do que foi feito (para log e evidência).
 */
async function sincronizar({ linhas, cliente, executorId = EXECUTOR_ID, agora = new Date() }) {
  const ativas = contarAtivas(linhas);
  const publicado = await cliente.executorPublicado(executorId);
  const acao = decidir({ ativas, executorPublicado: publicado });
  if (acao === 'publicar') await cliente.publicar(executorId);
  if (acao === 'despublicar') await cliente.despublicar(executorId);
  return { em: agora.toISOString(), ativas, estavaPublicado: publicado, acao };
}

/**
 * Cliente real da API pública do n8n (para quando houver chave). Não é usado nos testes.
 * baseUrl: https://vinciautomacao.app.n8n.cloud/api/v1 ; chave: lida de variável/credencial, nunca do repositório.
 */
function clienteN8n({ baseUrl, chave, fetchFn = fetch }) {
  if (!chave) throw new Error('Falta a chave da API do n8n (criar em Configurações > API; decisão do Leandro).');
  const h = { 'X-N8N-API-KEY': chave, accept: 'application/json' };
  return {
    async executorPublicado(id) {
      const r = await fetchFn(`${baseUrl}/workflows/${id}`, { headers: h });
      if (!r.ok) throw new Error('n8n ' + r.status);
      return !!(await r.json()).active;
    },
    async publicar(id) {
      const r = await fetchFn(`${baseUrl}/workflows/${id}/activate`, { method: 'POST', headers: h });
      if (!r.ok) throw new Error('n8n activate ' + r.status);
    },
    async despublicar(id) {
      const r = await fetchFn(`${baseUrl}/workflows/${id}/deactivate`, { method: 'POST', headers: h });
      if (!r.ok) throw new Error('n8n deactivate ' + r.status);
    }
  };
}

module.exports = { EXECUTOR_ID, contarAtivas, decidir, sincronizar, clienteN8n };

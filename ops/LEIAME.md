# Ferramentas operacionais (proposta, revisável)

Nada aqui está ligado em produção. Sem chaves, senhas ou dados de clientes.

## executor-gate — opção A do n8n (aguarda decisão do Leandro)
O executor de automações do Félix (a cada 5 min) só fica publicado enquanto houver automação ativa.
A promessa "até 5 minutos" não muda; com a tabela vazia (como hoje) deixam de rodar ~8.640 execuções por mês.
Para ligar de verdade falta a chave da API do n8n (decisão do Leandro) e chamar `sincronizar` no fluxo
"Felyx — automações do cliente" depois de salvar/apagar/pausar.
Testes: `node --test ops/executor-gate/` (cliente da API simulado).

## executores-conta — adaptadores de criação de conta
Separação: o controle (ordem, status, evidência) é o formulário do n8n; aqui ficam só os adaptadores de tela.
- `criarEmailICloud`, `criarContaAmazon` (Playwright) e `roteiroContaVinci` (Android).
- Param em senha (`precisa_operador`), telefone obrigatório (`exige_telefone`), CAPTCHA (`intervencao`) e código (`aguardando_codigo`).
- Modo real exige `confirmacaoReal: 'SIM, CONTA REAL'` e para antes do clique final (`pronto_para_enviar`).
- Seletores dos sites reais NÃO validados; testes só em páginas fictícias.
Testes: `node --test ops/executores-conta/test/`.

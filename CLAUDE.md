# Regras permanentes do projeto Félix (Vinci Automação)

## Nomes e pronúncia — inegociável
Chamar alguém pelo nome errado é ofensa. Vale para todos os Félix (GEN, FULL, PRO, V, app, WhatsApp, avatar), para os textos e para quem trabalha neste projeto.

- **Félix**: a marca se escreve **Felyx** (F-E-L-Y-X) nas telas, nos botões e no código, e se fala sempre **Félix**, como o nome em português. Nunca "Felics", "Felis" nem soletrado.
- **Vinci** (a empresa, Vinci Automação, e Leonardo da Vinci): sempre em italiano, **Víntchi**. Nunca "Vince", "Vínsi" nem "Vinssi". Quando o Leandro fala "vinte" ou "20" sobre a empresa, ele quer dizer Vinci.
- **Respostas ao Leandro**: no texto escreva **Félix** e **Vinci**. **Víntchi** é só a pronúncia: vai nas instruções de voz (Gemini, TTS, avatar), nunca no texto escrito.
- **Onde a regra está gravada**:
  - no prompt de cada página de voz (`felyx-vinci-site/{gen,full,pro,v}.html` e `jarvis-leandro/app/index.html`);
  - na voz dos áudios do WhatsApp: o nó Gemini TTS troca Felyx por Félix e Vinci por Víntchi nos workflows "Felyx — WhatsApp" e "Felyx — mandar áudio".
  - Página ou fluxo novo que fale precisa ter a mesma regra.

## Como trabalhar com o Leandro
Leia `TUDO-QUE-ME-IRRITA-NO-CLAUDE.md` antes de responder. Resumo: trabalho ao vivo, o Claude faz (clica, digita, abre o Chrome, o terminal ou um site) em vez de passar a tarefa de volta; nunca "não consigo" antes de tentar; vai até o fim da tarefa.

## Rodada com o GPT (Codex) e o Gemini — a cada 2 horas (desde 06/11/2026)
- O Claude roda nas horas pares de Brasília (16h, 18h, 20h, 22h, 0h, 2h, 4h…), madrugada inclusive. O ChatGPT faz a mesma rodada nas horas ímpares, intercalado.
- Em cada rodada o Claude pergunta ao GPT/Codex e ao Gemini o que cada um está produzindo, revisa as conversas e as pendências que o Leandro já citou (`CONTINUAR.md`, lista de pendências, commits, falhas abertas em `felyx_falhas`), confere se está tudo certo e usa o token que sobra para produzir entregas úteis para o Leandro.
- Supervisão: na hora ímpar, enquanto o ChatGPT faz a rodada dele, o Claude supervisiona o GPT e o Gemini a cada 15 minutos (:00, :15, :30 e :45). Confere o que mudou (commits, inclusive os do Codex; workflows do n8n; execuções com erro; falhas abertas), pergunta curto aos dois o que estão fazendo e corrige ou anota o que estiver errado. São quatro agendamentos, um por quarto de hora, porque o agendador não aceita intervalo menor que 1 hora num só.
- Cada rodada termina com um registro curto em `rodadas/AAAA-MM-DD.md`: o que cada IA disse, o que foi conferido, o que foi entregue e o que depende do Leandro.
- Canal na nuvem: workflow do n8n "Felyx — GPT e Gemini para o Turbo local" (POST `felix/ia-assessor`, `modelo` = gpt|gemini). O ChatGPT do Mac (Codex, com a conta do Leandro) só é alcançado quando o Mac está conectado a esta sessão (Chrome ou Controle Remoto).

## Login Google pelo ChatGPT
- O ChatGPT do Mac tem a senha do Google do Leandro salva e a digita. Quando o Claude precisar entrar no Google (Play Store, Play Console, Agenda, Chrome), no n8n, no LiveAvatar ou em qualquer site com login Google, pede ao ChatGPT que preencha a caixa de senha, que já vem marcada. Não pedir a senha ao Leandro.
- A senha nunca aparece na conversa nem em arquivo deste repositório: só o ChatGPT digita.

## Outras regras
- Segurança (câmeras, fechaduras, maçanetas, alarmes): só com API oficial do fabricante. Biblioteca não oficial nunca, porque está em jogo o nome, a marca e a reputação do Leandro.
- Alerta de bebê ou de câmera: alarme alto e imagem da câmera na hora, sem conversa com o Félix.
- O rosto do Félix é só LiveAvatar. Nunca outro avatar que mexa a boca errado.
- Falha nunca vai para o cliente. O Félix ganha tempo ("deixa eu dar uma olhadinha aqui") e manda a falha em silêncio pelo canal interno (workflow "Felyx — falhas").
- A palavra "Alexa" não existe para o cliente: o sistema da casa se chama Vinci.
- Chaves e senhas ficam em arquivo ou nas credenciais do n8n, nunca na conversa.

# Regras permanentes do projeto Félix (Vinci Automação)

## Nomes e pronúncia — inegociável
Chamar alguém pelo nome errado é ofensa. Vale para todos os Félix (GEN, FULL, PRO, V, app, WhatsApp, avatar), para os textos e para quem trabalha neste projeto.

- **Félix**: a marca se escreve **Felyx** (F-E-L-Y-X) nas telas, nos botões e no código, e se fala sempre **Félix**, como o nome em português. Nunca "Felics", "Felis" nem soletrado.
- **Vinci** (a empresa, Vinci Automação, e Leonardo da Vinci): sempre em italiano, **Víntchi**. Nunca "Vince", "Vínsi" nem "Vinssi". Quando o Leandro fala "vinte" ou "20" sobre a empresa, ele quer dizer Vinci.
- **Respostas ao Leandro**: ele ouve o que você escreve em voz alta. No texto corrido escreva **Félix** e **Víntchi**. Nomes de arquivo e de workflow ficam como estão.
- **Onde a regra está gravada**:
  - no prompt de cada página de voz (`felyx-vinci-site/{gen,full,pro,v}.html` e `jarvis-leandro/app/index.html`);
  - na voz dos áudios do WhatsApp: o nó Gemini TTS troca Felyx por Félix e Vinci por Víntchi nos workflows "Felyx — WhatsApp" e "Felyx — mandar áudio".
  - Página ou fluxo novo que fale precisa ter a mesma regra.

## Outras regras
- O rosto do Félix é só LiveAvatar. Nunca outro avatar que mexa a boca errado.
- Falha nunca vai para o cliente. O Félix ganha tempo ("deixa eu dar uma olhadinha aqui") e manda a falha em silêncio pelo canal interno (workflow "Felyx — falhas").
- A palavra "Alexa" não existe para o cliente: o sistema da casa se chama Vinci.
- Chaves e senhas ficam em arquivo ou nas credenciais do n8n, nunca na conversa.

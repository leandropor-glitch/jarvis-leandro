# Felyx — ponto de continuação (16/10/2026, 17h10)

Leia este arquivo inteiro antes de qualquer coisa. Ele resume a conversa anterior com o Claude.

## Regras fixas do Leandro
- Felyx (escreve-se Felyx, fala-se "Félix"). Nunca dizer nem escrever "Alexa" nem "Jarvis".
- "20" ou "vinte" significa **Vinci**.
- Voz Algieba em todos os canais. ElevenLabs não.
- Navegar pelo Google Chrome, não pelo navegador embutido.
- Passos manuais em lista numerada. A última linha de mensagem que pede teste é o link clicável.
- Não mexer no app da Vinci (Tuya/OEM): decidido.

## Infraestrutura
- **n8n:** vinciautomacao.app.n8n.cloud, projeto O92IYnPANXQV7ZNk.
- **Repositório:** github.com/leandropor-glitch/jarvis-leandro (GitHub Pages).
  - Site do Felyx: `felyx.html` e `felyx-hud.html`.
  - App: `app/`. Projetos nativos: `apple/` e `android/`.
- **Mac Mini:** usuário leandroportella, macOS 27, Xcode 27.1 e Android Studio instalados. Acesso pelo Desktop Commander.
  - Ponte da casa em `~/jarvis-alexa-ponte`, porta 3456.
  - Túnel Cloudflare fixo pelo launchd: `com.vinci.felyx-ponte` e `com.vinci.felyx-tunel`. O endereço é avisado sozinho na Data Table felyx_ponte.
  - Tudo do app fica em `~/FelyxApp`:
    - `jarvis-leandro`: cópia do repositório.
    - `bin`: xcodegen, gradle 8.14.3 e jdk21. O Android precisa do JDK 21; o JBR 25 do Android Studio quebra o Gradle 8.
    - `chave-android`: keystore de envio da Play Store e suas senhas. Ainda falta backup.
    - `entregas`: Felyx.ipa, FelyxAI-1.0.0.aab e FelyxAI-teste.apk.

## Workflows n8n (todos publicados)
| Workflow | ID | Papel |
|---|---|---|
| Jarvis cópia Claude (cérebro) | vyAtvfh6nk5Es0lQ | Agente Claude Haiku. Lê o painel (Data Table) e tem a ferramenta "Ler notícia". Memória do dia `-r4` |
| Felyx — ponte Gemini Live | IusDICYBSZm8z00Q | /felix/token, /pergunta, /mercado, /noticias, /boasvindas |
| Felyx — ler notícia | HlIQSF1sptp6ACzJ | Abre a matéria e extrai o texto (sub-workflow do cérebro) |
| Felyx — WhatsApp | G4bV9cRAkRaGscBN | Meta Cloud API (+55 21 96778-9150, Phone ID 1379919548538322). Proteção contra duplicidade de transcritores. Comando da casa vai pelo atalho, sem IA |
| Felyx — atalho da casa | RwyNr64qIkjDe4QS | Comando simples vai direto para a ponte /acao ou /comando (cerca de 3 s) |
| **Felyx — app (login e casa)** | hsy4DwI0zHn5UYQD | POST /felix/app {acao}: codigo, verificar, senha, entrar, sessao, sair, casa, comando. O código vai primeiro pelo modelo de autenticação da Meta (`codigo_app_felyx`); se a Meta recusar, vai em texto simples |
| Felyx — utilitário Meta (modelo de autenticação) | 1dMldhWsMsgbizqT | Rodar à mão: cria/consulta o modelo `codigo_app_felyx` na WABA 1591473832732583. Pode ser arquivado quando o modelo estiver aprovado |

### Data Tables
| Tabela | ID | Conteúdo |
|---|---|---|
| felyx_painel | am8Jc1m5PlYUv2kU | Linhas noticias, mercado, boasvindas e aparelhos |
| felyx_whatsapp_contatos | rmHuadZik1GNY4Aq | 5521999292915 Leandro, 5521976301803 Leandro, 5521975764965 Joana, 5521994865960 Felipinho |
| felyx_whatsapp_recentes | LYqLQTceKXvNoFqM | Mensagens recentes, usadas contra duplicidade |
| felyx_ponte | 3XOtOZtiF0ubkhY7 | Endereço do túnel da casa |
| felyx_app_usuarios | diqPFf01b6S5wlsQ | Senha em scrypt; código, ticket e sessões guardados só como hash |

## App Felyx AI Vinci (estado atual)
- **Uma página para quase tudo:** `app/index.html` serve iPhone, iPad, Mac, Vision Pro e Android, no layout aprovado de cada um (parâmetro `?p=ios|ipad|mac|vision|android`).
  - Login: número autorizado, código no WhatsApp e senha própria.
  - Seções: casa (cenas, aparelhos, favoritos), notícias e mercado, voz Gemini Live (Algieba), chat em texto.
  - Atalho do WhatsApp em Ajustes.
- **Apple** (`apple/`, gerado com XcodeGen a partir de `project.yml`):
  - Alvo multiplataforma FelyxAI (iOS, macOS, visionOS) usando WKWebView e mais:
    - microfone;
    - links externos abrindo fora do app;
    - token no Keychain;
    - Siri: Falar, Ativar cena, Comando da casa, Perguntar.
  - Alvo FelyxAI-TV: SwiftUI nativo (a TV não tem WebView). Respostas só em texto.
  - Bundle com.vinci.felyx, time **J3WX42F6Y7** (conta Individual).
  - Envio às lojas: `apple/enviar-lojas.sh` (archive + upload das 4 plataformas). iOS/visionOS/tvOS: archive sem assinatura (`CODE_SIGNING_ALLOWED=NO`); macOS: assinatura ad-hoc, senão o entitlement de sandbox não entra e a App Store recusa.
- **Android** (`android/`): WebView, atalhos do ícone (Falar, Casa, WhatsApp). O .aab de release está assinado.

## Feito em 16/10/2026 (tarde)
- **App Store Connect:** app **Felyx AI Vinci** criado (Apple ID 6823749242; iOS, macOS, tvOS, visionOS; pt-BR; SKU felyx-ai-vinci). Os 4 builds 1.0.0 (1) foram enviados e o iOS já aparece como "Pronta para envio" no TestFlight. https://appstoreconnect.apple.com/apps/6823749242
- **Play Console:** app **Felyx AI Vinci** criado na conta Vinci Lab (id 4972361764809538063, pacote com.vinci.felyx). `FelyxAI-1.0.0.aab` publicado no **teste interno**, com a lista "Teste EU" (leandropor@gmail.com). Link para o testador entrar: https://play.google.com/apps/internaltest/4700990083462037162
- **Meta:** modelo de autenticação `codigo_app_felyx` (pt_BR, botão copiar código, expira em 10 min) criado na WABA; estava **PENDING** no fim da sessão. O login já tenta o modelo e cai para texto enquanto não aprovar.
- **Cérebro:** reconhece Joana e Felipinho pelo aviso "(Nome falando pelo app)" / "(Nome falando pelo WhatsApp)"; o workflow do WhatsApp agora manda esse aviso também. Testado: "Oi, Joana!".
- **Login real:** testado pelo GitHub Pages com o número do Leandro: o código chegou no WhatsApp (pelo caminho de texto). Falta só ele digitar o código e criar a senha.

## Próximos passos
1. **Lojas (parte do Leandro):** no App Store Connect, aceitar o acordo atualizado (Paid Applications Schedule, em Business, mesmo o app sendo grátis a tela pede) e preencher a ficha do app (capturas, descrição, privacidade) antes de enviar para revisão. No Play Console, concluir o painel "Começar a configuração do app" (classificação, política de privacidade, segurança de dados, público) antes de ir para produção.
2. **Meta:** conferir se o modelo `codigo_app_felyx` foi aprovado (rodar o workflow 1dMldhWsMsgbizqT); quando aprovar, o código passa a chegar mesmo fora da janela de 24 h.
3. **Backup da `chave-android`** (keystore da Play Store): ainda falta.
4. **Lista de pendências:** está na memória, em /areas/pendencias.md. O Leandro vai dividir os itens entre Claude, Gemini e ChatGPT.

## Versão 1.0.1 (16/10/2026, 18h20)
- Ícone oficial (marca/icone-oficial.png) e retrato novo do Felyx dentro do app (app/felyx-retrato.jpg, sem ciborgue, do cabelo ao V da camisa).
- Apple: 1.0.1 (2) enviada nas 4 plataformas com `apple/enviar-lojas.sh` (lista padrão de plataformas corrigida).
- Android: 1.0.1 (versionCode 2) publicada no teste interno da Play Console.

## 17/10/2026 (manhã) — app no TestFlight "não consegui conectar a voz"
- **Causa:** na noite de 16/10 o site felyx.html ganhou login (telefone + senha da casa; workflow `Felyx — login e acesso` Hh7SMvhAhGmYzjrn, tabelas felyx_acesso, felyx_config e felyx_sessoes) e a ponte Gemini Live passou a exigir sessão em `/felix/token`, `/felix/pergunta` e `/felix/boasvindas`. O app tem login próprio (hsy4DwI0zHn5UYQD, hash em felyx_app_usuarios) e não mandava sessão nenhuma → 401 → voz e chat do app pararam.
- **Correção:** sub-workflow novo **`Felyx — sessão válida?`** (fM6kN2wSnKzKIVjO): recebe `token`, aceita a sessão do site (felyx_sessoes) **ou** a do app (SHA-256 em felyx_app_usuarios.sessoes) e devolve { token, telefone, nome, expira, origem }. Os três nós "Verificar sessão" da ponte chamam esse sub-workflow; "Sessão ok?" e "Negar" ficaram iguais. A página `app/index.html` (versão 1.0.2) passou a mandar `?s=<token>` em /felix/token e `sessao` no corpo de /felix/pergunta, e volta para o login quando recebe 401/relogar. `FelyxAPI.perguntar` (Siri "Perguntar" e Apple TV) também manda `sessao` — isso só vale na próxima build nativa (project.yml já está em 1.0.2 (3)).
- Nada mudou no site felyx.html nem no login dele. Nenhuma build nova é necessária para iPhone/iPad/Mac/Android: a página é carregada do GitHub Pages.

## Publicação em produção (em andamento, 16/10/2026 19h)
- Conta de demonstração para revisores: número **0000000000**, senha **Felyx2026Revisao** (linha 550000000000 em felyx_app_usuarios; comandos da casa simulados; o cérebro recebe aviso de modo demonstração).
- Páginas: app/privacidade.html, app/suporte.html, app/excluir-conta.html. Capturas e banner em lojas/capturas.
- Play Console — feito: política de privacidade, detalhes do login (conta demo), anúncios (não), classificação (Livre), público-alvo (18+), ID de publicidade (não), app governamental (não), recursos financeiros (nenhum), saúde (nenhum).
- Play Console — falta: Segurança dos dados (parei na etapa Tipos de dados: marcado Número de telefone; falta Áudio > gravações de voz e Atividade no app > outro conteúdo gerado; depois uso/tratamento), ficha da loja (descrição, ícone, banner, capturas, categoria Casa e decoração / Estilo de vida, contato), criar versão de produção com o .aab 1.0.1 e enviar para revisão.
- App Store Connect — falta tudo da ficha: capturas (lojas/capturas), descrição, palavras-chave, URL de suporte e privacidade, privacidade do app, classificação etária, dados de revisão (conta demo), escolher build 1.0.1 (2) e enviar para revisão; o mesmo para macOS, visionOS e tvOS.

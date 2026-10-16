# Felyx — ponto de continuação (16/10/2026, 16h30)

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
| **Felyx — app (login e casa)** | hsy4DwI0zHn5UYQD | POST /felix/app {acao}: codigo, verificar, senha, entrar, sessao, sair, casa, comando |

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
  - Os 4 alvos compilam. O .ipa está assinado para distribuição (exportado com `-allowProvisioningUpdates`).
- **Android** (`android/`): WebView, atalhos do ícone (Falar, Casa, WhatsApp). O .aab de release está assinado.

## Próximos passos
1. **App Store Connect:** o Leandro cria o app com estes dados:
   - Nome: Felyx AI Vinci. Idioma: pt-BR. Bundle: com.vinci.felyx. SKU: felyx-ai-vinci.
   - Plataformas: iOS, macOS, visionOS e tvOS.
   - Depois o Claude envia, no Mac: `xcodebuild -exportArchive ... -exportOptionsPlist apple/ExportOptions.plist -allowProvisioningUpdates`. O archive precisa ser gerado com `CODE_SIGNING_ALLOWED=NO`, porque a conta não tem aparelho cadastrado para perfil de desenvolvimento. Faltam ainda os archives de Mac, visionOS e tvOS.
2. **Play Console:** criar o app e subir `entregas/FelyxAI-1.0.0.aab`.
3. **Testar o login real:** pelo link https://leandropor-glitch.github.io/jarvis-leandro/app/
4. **Meta:** modelo de mensagem de autenticação. Sem ele, o código só chega a quem falou com o Felyx nas últimas 24 h.
5. **Cérebro:** ajustar para reconhecer Joana e Felipinho. O app já manda "(Nome falando pelo app)".
6. **Lista de pendências:** está na memória, em /areas/pendencias.md. O Leandro vai dividir os itens entre Claude, Gemini e ChatGPT.

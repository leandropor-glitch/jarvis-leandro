# Janete: espelho local do Skynet Chat

O site estático é publicado no GitHub Pages. A ponte roda no Mac, vinculada a `127.0.0.1`, e mantém as mensagens em `~/Library/Application Support/Janete`. Conversas e senhas não são enviadas ao repositório. Para uso no tablet fora do Mac, será necessário um túnel HTTPS privado apontando para a porta 3471; não há serviço n8n ou armazenamento de conversa na nuvem.

## Preparar o Mac

1. Com Node.js 20 ou superior instalado, abra Terminal nesta pasta e execute `sh setup-local.sh`. Guarde a senha impressa: esse é o primeiro acesso.
2. Em `chrome://extensions`, ligue o modo de desenvolvedor, escolha **Carregar sem compactação** e selecione a pasta `extension`.
3. Deixe o Chrome conectado ao Skynet Chat e a guia da conversa aberta.
4. Execute `sh start-local.sh` e mantenha o Terminal aberto. A ponte não recebe tráfego da rede local: ela escuta apenas em `127.0.0.1`.
5. No site, use `http://127.0.0.1:3471` como ponte e a senha inicial.

A extensão espelha as mensagens renderizadas na conversa aberta e encaminha respostas enviadas pelo site à caixa de composição do Skynet. O site não consegue ler mensagens quando o Chrome, a extensão ou a ponte estão fechados.

## Acesso remoto

GitHub Pages não protege uma página por senha: o site e seu código são públicos. A tela de senha é validada pela ponte local, mas não torna privado o HTML publicado. Para acesso temporário pelo tablet, instale `cloudflared` pela distribuição oficial e rode `cloudflared tunnel --url http://127.0.0.1:3471`. O endereço `trycloudflare.com` muda a cada execução e deixa de funcionar quando o processo termina; qualquer pessoa com esse endereço alcança a tela de login, mas a ponte valida a senha e limita tentativas. Ponha o endereço na URL do site como `?api=https%3A%2F%2FSEU-ENDERECO.trycloudflare.com` ou no campo “Endereço da ponte”. Quick Tunnels são para teste, não disponibilidade de produção. Não publique o token da extensão, a senha, nem o arquivo `messages.jsonl`.

#!/bin/bash
# Felyx — instala o túnel "fixo" da ponte da casa no Mac Mini.
# O que faz:
#  1. Liga a ponte (server.js) e o túnel Cloudflare sozinhos sempre que o Mac liga (launchd), e religa se cair.
#  2. Toda vez que o túnel ganha um endereço novo, avisa o n8n (workflow "Felyx — endereço da ponte").
#     O cérebro do Felyx lê esse endereço sozinho; ninguém precisa trocar URL à mão.
# Uso: dê dois cliques neste arquivo (ou rode: bash instalar-tunel-fixo.command).

set -u
PONTE_DIR="$HOME/jarvis-alexa-ponte"
N8N_AVISO="https://vinciautomacao.app.n8n.cloud/webhook/felix/ponte-endereco"
LA="$HOME/Library/LaunchAgents"
UIDN="$(id -u)"

ok()   { printf "\033[32m✔ %s\033[0m\n" "$*"; }
info() { printf "• %s\n" "$*"; }
erro() { printf "\033[31m✘ %s\033[0m\n" "$*"; echo; read -r -p "Aperte Enter para fechar." _; exit 1; }

echo "=== Felyx: túnel fixo da ponte da casa ==="
[ -d "$PONTE_DIR" ] || erro "Não achei a pasta $PONTE_DIR neste Mac. Rode este instalador no Mac onde a ponte está."
[ -f "$PONTE_DIR/server.js" ] || erro "Não achei $PONTE_DIR/server.js."
[ -f "$PONTE_DIR/config.json" ] || erro "Não achei $PONTE_DIR/config.json."

# 1) Node da ponte
NODE=""
for c in "$PONTE_DIR"/node/bin/node "$PONTE_DIR"/node-*/bin/node "$PONTE_DIR"/runtime/bin/node /opt/homebrew/bin/node /usr/local/bin/node "$(command -v node 2>/dev/null)"; do
  [ -n "$c" ] && [ -x "$c" ] && { NODE="$c"; break; }
done
[ -n "$NODE" ] || erro "Não achei o Node usado pela ponte."
ok "Node: $NODE"

# 2) Senha da ponte (a mesma que o n8n usa no cabeçalho x-ponte-token)
SENHA="$("$NODE" -e '
const c=require(process.argv[1]);
const k=["senha","token","password","chave","apiKey","secret","ponteToken","PONTE_TOKEN"];
for(const n of k){ if(typeof c[n]==="string"&&c[n]) { console.log(c[n]); process.exit(0); } }
for(const [n,v] of Object.entries(c)){ if(typeof v==="string"&&/senha|token|pass|secret|chave/i.test(n)&&v){ console.log(v); process.exit(0);} }
' "$PONTE_DIR/config.json" 2>/dev/null)"
[ -n "$SENHA" ] || erro "Não consegui ler a senha da ponte no config.json."
ok "Senha da ponte lida do config.json"

# 3) Porta da ponte
PORTA=""
PID_ATUAL="$(pgrep -f "server.js" | while read -r p; do lsof -a -p "$p" -d cwd -Fn 2>/dev/null | grep -q "n$PONTE_DIR" && echo "$p"; done | head -1)"
if [ -n "$PID_ATUAL" ]; then
  PORTA="$(lsof -nP -a -p "$PID_ATUAL" -iTCP -sTCP:LISTEN 2>/dev/null | awk 'NR>1{print $9}' | sed 's/.*://' | head -1)"
fi
[ -n "$PORTA" ] || PORTA="$("$NODE" -e 'const c=require(process.argv[1]);const p=c.porta||c.port||c.PORT;if(p)console.log(p)' "$PONTE_DIR/config.json" 2>/dev/null)"
[ -n "$PORTA" ] || PORTA="$(grep -Eo 'listen\(\s*[0-9]{2,5}|PORT\s*\|\|\s*[0-9]{2,5}|porta\s*\|\|\s*[0-9]{2,5}' "$PONTE_DIR/server.js" | grep -Eo '[0-9]{2,5}' | head -1)"
[ -n "$PORTA" ] || PORTA=3000
ok "Porta da ponte: $PORTA"

# 4) cloudflared
CF=""
for c in "$(command -v cloudflared 2>/dev/null)" /opt/homebrew/bin/cloudflared /usr/local/bin/cloudflared "$PONTE_DIR/cloudflared"; do
  [ -n "$c" ] && [ -x "$c" ] && { CF="$c"; break; }
done
if [ -z "$CF" ]; then
  info "Baixando o cloudflared (oficial, GitHub da Cloudflare)…"
  ARQ="cloudflared-darwin-amd64.tgz"; [ "$(uname -m)" = "arm64" ] && ARQ="cloudflared-darwin-arm64.tgz"
  curl -fsSL "https://github.com/cloudflare/cloudflared/releases/latest/download/$ARQ" -o "/tmp/$ARQ" || erro "Falhou o download do cloudflared."
  tar -xzf "/tmp/$ARQ" -C "$PONTE_DIR" && chmod +x "$PONTE_DIR/cloudflared" && CF="$PONTE_DIR/cloudflared"
fi
[ -x "$CF" ] || erro "Não achei nem consegui baixar o cloudflared."
ok "cloudflared: $CF"

# 5) Script do túnel (sobe o túnel, descobre o endereço e avisa o n8n)
cat > "$PONTE_DIR/felyx-tunel.sh" <<EOF
#!/bin/bash
# Gerado pelo instalar-tunel-fixo.command. Rodado pelo launchd (com.vinci.felyx-tunel).
LOG="$PONTE_DIR/logs/cloudflared.log"
mkdir -p "$PONTE_DIR/logs"; : > "\$LOG"
"$CF" tunnel --no-autoupdate --url "http://localhost:$PORTA" >> "\$LOG" 2>&1 &
CFPID=\$!
trap 'kill \$CFPID 2>/dev/null' EXIT TERM INT
URL=""
for i in \$(seq 1 90); do
  URL="\$(grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' "\$LOG" | head -1)"
  [ -n "\$URL" ] && break
  kill -0 \$CFPID 2>/dev/null || exit 1
  sleep 1
done
[ -n "\$URL" ] || exit 1
avisar() {
  curl -fsS -m 20 -X POST "$N8N_AVISO" -H "content-type: application/json" -H "x-ponte-token: $SENHA" \
    -d "{\"url\":\"\$URL\",\"maquina\":\"\$(scutil --get ComputerName 2>/dev/null)\"}" >/dev/null
}
until avisar; do sleep 15; kill -0 \$CFPID 2>/dev/null || exit 1; done
echo "\$(date '+%d/%m %H:%M') endereço avisado: \$URL" >> "$PONTE_DIR/logs/enderecos.log"
# Reavisa a cada 15 min (se o n8n perder o endereço, volta sozinho) enquanto o túnel estiver vivo
while kill -0 \$CFPID 2>/dev/null; do
  for i in \$(seq 1 90); do sleep 10; kill -0 \$CFPID 2>/dev/null || exit 1; done
  avisar
done
exit 1
EOF
chmod 700 "$PONTE_DIR/felyx-tunel.sh"
ok "Script do túnel criado"

# 6) Para a ponte e o túnel que estiverem rodando à mão
info "Parando a ponte e o túnel antigos…"
launchctl bootout "gui/$UIDN/com.vinci.felyx-ponte" 2>/dev/null
launchctl bootout "gui/$UIDN/com.vinci.felyx-tunel" 2>/dev/null
pkill -f "cloudflared.*tunnel" 2>/dev/null
[ -n "$PID_ATUAL" ] && kill "$PID_ATUAL" 2>/dev/null
for p in $(lsof -ti tcp:"$PORTA" -sTCP:LISTEN 2>/dev/null); do kill "$p" 2>/dev/null; done
sleep 2

# 7) launchd: liga sozinho no login e religa se cair
mkdir -p "$LA" "$PONTE_DIR/logs"
cat > "$LA/com.vinci.felyx-ponte.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.vinci.felyx-ponte</string>
  <key>ProgramArguments</key><array><string>$NODE</string><string>$PONTE_DIR/server.js</string></array>
  <key>WorkingDirectory</key><string>$PONTE_DIR</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>StandardOutPath</key><string>$PONTE_DIR/logs/ponte.log</string>
  <key>StandardErrorPath</key><string>$PONTE_DIR/logs/ponte.log</string>
</dict></plist>
EOF
cat > "$LA/com.vinci.felyx-tunel.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.vinci.felyx-tunel</string>
  <key>ProgramArguments</key><array><string>/bin/bash</string><string>$PONTE_DIR/felyx-tunel.sh</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>20</integer>
  <key>StandardOutPath</key><string>$PONTE_DIR/logs/tunel.log</string>
  <key>StandardErrorPath</key><string>$PONTE_DIR/logs/tunel.log</string>
</dict></plist>
EOF
: > "$PONTE_DIR/logs/enderecos.log"
launchctl bootstrap "gui/$UIDN" "$LA/com.vinci.felyx-ponte.plist" || erro "Não consegui ligar a ponte no launchd."
sleep 3
launchctl bootstrap "gui/$UIDN" "$LA/com.vinci.felyx-tunel.plist" || erro "Não consegui ligar o túnel no launchd."
ok "Ponte e túnel ligados (voltam sozinhos ao reiniciar o Mac)"

# 8) Confere
info "Esperando o túnel avisar o endereço ao n8n (até 2 min)…"
URL=""
for i in $(seq 1 60); do
  URL="$(grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' "$PONTE_DIR/logs/enderecos.log" 2>/dev/null | tail -1)"
  [ -n "$URL" ] && break; sleep 2
done
[ -n "$URL" ] || erro "O túnel não avisou o endereço. Veja $PONTE_DIR/logs/tunel.log e cloudflared.log."
ok "Endereço avisado ao n8n: $URL"
sleep 5
COD="$(curl -s -o /dev/null -w '%{http_code}' -m 30 -H "x-ponte-token: $SENHA" "$URL/dispositivos")"
if [ "$COD" = "200" ]; then ok "A casa responde pelo túnel (HTTP 200). Tudo pronto."; else info "A casa respondeu HTTP $COD pelo túnel; se não for 200, me mande a pasta logs."; fi
echo
echo "Pronto. Pode fechar esta janela."
read -r -p "Aperte Enter para fechar." _

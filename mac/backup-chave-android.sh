#!/bin/bash
# Backup da chave de envio da Play Store (~/FelyxApp/chave-android).
# Sem essa chave não dá para publicar atualização do Felyx AI Vinci na Play Store.
#
# O que faz:
#   1. Cria uma imagem de disco CRIPTOGRAFADA (AES-256, ferramenta do próprio macOS)
#      com a pasta chave-android dentro.
#   2. Guarda uma cópia no iCloud Drive (pasta "Backup Vinci") e outra em ~/Documents.
#   3. Abre a imagem com a senha para conferir que o backup está legível e igual ao original.
#
# A senha da imagem é digitada na hora (o macOS pede) e não fica gravada em lugar nenhum.
# Guarde essa senha no gerenciador de senhas: sem ela o backup não abre.
#
# Uso, no Terminal do Mac Mini:  bash ~/FelyxApp/jarvis-leandro/mac/backup-chave-android.sh
set -euo pipefail

ORIGEM="$HOME/FelyxApp/chave-android"
DATA="$(date +%Y-%m-%d)"
NOME="chave-android-felyx-$DATA.dmg"
TEMP="$(mktemp -d)"
ICLOUD="$HOME/Library/Mobile Documents/com~apple~CloudDocs/Backup Vinci"
LOCAL="$HOME/Documents/Backup Vinci"

trap 'rm -rf "$TEMP"' EXIT

if [ ! -d "$ORIGEM" ] || [ -z "$(ls -A "$ORIGEM")" ]; then
  echo "Não achei a chave em $ORIGEM (pasta vazia ou inexistente). Nada foi feito."
  exit 1
fi

echo "Escolha uma senha para o backup (ela não fica gravada em lugar nenhum)."
read -r -s -p "Senha do backup: " S1; echo
read -r -s -p "Repita a senha: " S2; echo
if [ -z "$S1" ] || [ "$S1" != "$S2" ]; then echo "As senhas não batem. Nada foi feito."; exit 1; fi

echo "Criando a imagem criptografada…"
printf '%s' "$S1" | hdiutil create -quiet -srcfolder "$ORIGEM" -volname "chave-android" \
  -encryption AES-256 -stdinpass -format UDZO "$TEMP/$NOME"
unset S1 S2

echo "Conferindo o backup (digite a mesma senha mais uma vez)."
PONTO="$TEMP/conferir"
mkdir -p "$PONTO"
read -r -s -p "Senha do backup: " S3; echo
printf '%s' "$S3" | hdiutil attach -quiet -stdinpass -nobrowse -readonly -mountpoint "$PONTO" "$TEMP/$NOME"
if diff -rq "$ORIGEM" "$PONTO" >/dev/null; then
  echo "Backup conferido: igual ao original."
else
  hdiutil detach -quiet "$PONTO" || true
  echo "ATENÇÃO: o conteúdo do backup não bate com o original. Nada foi copiado."
  exit 1
fi
hdiutil detach -quiet "$PONTO"

for DEST in "$ICLOUD" "$LOCAL"; do
  mkdir -p "$DEST"
  cp "$TEMP/$NOME" "$DEST/"
  echo "Copiado para: $DEST/$NOME"
done

echo
echo "Pronto. Guarde a senha do backup no gerenciador de senhas."
echo "Para abrir no futuro: dois cliques no .dmg e digitar a senha."

#!/bin/zsh
# Felyx AI Vinci — gera os archives das 4 plataformas Apple e envia ao App Store Connect.
# Uso: cd apple && ./enviar-lojas.sh            (todas)  |  ./enviar-lojas.sh iOS   (uma só)
# Antes de mudar a versão: edite MARKETING_VERSION / CURRENT_PROJECT_VERSION no project.yml
# e rode "xcodegen generate" (o binário fica em ~/FelyxApp/bin/xcodegen/bin/xcodegen).
#
# Por que cada plataforma é assinada de um jeito:
# - iOS, visionOS e tvOS: archive SEM assinatura (CODE_SIGNING_ALLOWED=NO), porque a conta não
#   tem aparelho cadastrado para perfil de desenvolvimento; o exportArchive assina na nuvem.
# - macOS: archive com assinatura ad-hoc ("-"), porque a App Store exige o entitlement
#   com.apple.security.app-sandbox e ele só entra no archive quando o codesign roda.
set -e
cd "$(dirname "$0")"
export PATH="$HOME/FelyxApp/bin:$HOME/FelyxApp/bin/xcodegen/bin:$PATH"

plataformas=("$@"); (( ${#plataformas} )) || plataformas=(iOS macOS visionOS tvOS)

for p in $plataformas; do
  echo "=== $p: archive ==="
  case $p in
    iOS)      esquema=FelyxAI;    destino="generic/platform=iOS";      assinatura=(CODE_SIGNING_ALLOWED=NO) ;;
    visionOS) esquema=FelyxAI;    destino="generic/platform=visionOS"; assinatura=(CODE_SIGNING_ALLOWED=NO) ;;
    tvOS)     esquema=FelyxAI-TV; destino="generic/platform=tvOS";     assinatura=(CODE_SIGNING_ALLOWED=NO) ;;
    macOS)    esquema=FelyxAI;    destino="generic/platform=macOS";    assinatura=(CODE_SIGN_STYLE=Manual CODE_SIGN_IDENTITY=- CODE_SIGNING_REQUIRED=NO PROVISIONING_PROFILE_SPECIFIER=) ;;
    *) echo "plataforma desconhecida: $p"; exit 1 ;;
  esac
  rm -rf "build/Felyx-$p.xcarchive" "build/upload-$p"
  xcodebuild archive -project FelyxAI.xcodeproj -scheme $esquema -configuration Release \
    -destination "$destino" -archivePath "build/Felyx-$p.xcarchive" $assinatura -quiet

  echo "=== $p: envio ao App Store Connect ==="
  xcodebuild -exportArchive -archivePath "build/Felyx-$p.xcarchive" \
    -exportOptionsPlist ExportOptions.plist -exportPath "build/upload-$p" -allowProvisioningUpdates \
    | grep -i "upload succeeded\|export succeeded\|error" || true
done
echo "Pronto. Confira em https://appstoreconnect.apple.com/apps/6823749242/testflight/ios"

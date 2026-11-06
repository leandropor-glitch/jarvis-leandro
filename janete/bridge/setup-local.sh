#!/bin/sh
set -eu
cd "$(dirname "$0")"

if [ -e .env ] || [ -e extension/config.js ]; then
  printf '%s\n' 'Configuração local já existe; não sobrescrevi credenciais.' >&2
  exit 1
fi

JANETE_SETUP_DIR="$PWD" node -e '
const fs=require("node:fs"),crypto=require("node:crypto"),path=require("node:path");
const dir=process.env.JANETE_SETUP_DIR;
const password=crypto.randomBytes(18).toString("base64url");
const token=crypto.randomBytes(32).toString("base64url");
fs.writeFileSync(path.join(dir,".env"),`JANETE_PASSWORD=${password}\nJANETE_EXTENSION_TOKEN=${token}\nJANETE_PORT=3471\n`,{mode:0o600,flag:"wx"});
fs.writeFileSync(path.join(dir,"extension","config.js"),`globalThis.JANETE_LOCAL = Object.freeze({api:"http://127.0.0.1:3471",extensionToken:${JSON.stringify(token)}});\n`,{mode:0o600,flag:"wx"});
console.log(`Senha inicial da Janete: ${password}`);
console.log("Anote-a agora; ela fica somente neste Mac, em arquivo ignorado pelo Git.");
'

// Executores de conta da Vinci (e-mail → conta Vinci → conta Amazon).
// SEPARAÇÃO: o "controle" (ordem, status, evidência) fica no n8n (workflow lpA0nWbo7iOkzLz4).
// Aqui ficam só os adaptadores que mexem na tela do provedor, com Playwright.
//
// Regras fixas (Leandro, 01/11/2026):
//  - nunca preencher telefone; se o provedor exigir, parar com 'exige_telefone';
//  - nunca digitar senha: parar com 'precisa_operador' na etapa de senha;
//  - CAPTCHA, termos e códigos: parar com 'intervencao' ou 'aguardando_codigo' (sem contornar);
//  - modo 'real' só roda com confirmacaoReal === 'SIM, CONTA REAL' e para antes do clique final,
//    devolvendo 'pronto_para_enviar' para o operador conferir e clicar.
//
// Os seletores de produção NÃO foram validados nos sites reais: estão em SELETORES e serão
// ajustados na primeira execução assistida. Os testes usam páginas fictícias (fixtures/).

'use strict';

const RESULTADOS = ['concluido', 'pronto_para_enviar', 'aguardando_codigo', 'exige_telefone', 'precisa_operador', 'intervencao', 'erro'];

const SELETORES = {
  icloud: {
    adicionar: '[data-acao="adicionar-endereco"], button:has-text("Adicionar endereço")',
    campo: 'input[name="endereco"], input[placeholder*="endereço" i]',
    confirmar: '[data-acao="confirmar"], button:text-is("Adicionar")',
    sucesso: '[data-estado="adicionado"]',
    limite: '[data-estado="limite"]'
  },
  amazon: {
    email: 'input[name="email"], input#ap_email, input[type="email"]',
    continuar: '[data-acao="continuar"], input#continue, button:has-text("Continuar")',
    nome: 'input[name="customerName"], input#ap_customer_name',
    senha: 'input[type="password"]',
    telefoneObrigatorio: 'input[type="tel"][required], input[name="phoneNumber"][required]',
    pularTelefone: '[data-acao="agora-nao"], a:has-text("Agora não")',
    captcha: '[data-captcha], iframe[src*="captcha" i], img[src*="captcha" i], #auth-captcha-image',
    codigo: 'input[name="code"], input[name="otpCode"], input#cvf-input-code'
  }
};

function validarEmail(e) {
  return typeof e === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e.trim());
}

function exigirModo({ modo, confirmacaoReal }) {
  if (modo === 'simulacao') return;
  if (modo === 'real' && confirmacaoReal === 'SIM, CONTA REAL') return;
  throw new Error('Execução real bloqueada: precisa de modo "real" e confirmacaoReal "SIM, CONTA REAL".');
}

const fim = (resultado, evidencia, extra = {}) => {
  if (!RESULTADOS.includes(resultado)) throw new Error('resultado inválido: ' + resultado);
  return Object.assign({ resultado, evidencia }, extra);
};

async function visivel(page, sel) { return (await page.locator(sel).count()) > 0 && page.locator(sel).first().isVisible(); }

/** 1) E-mail no iCloud+ (domínio personalizado). Nunca pede telefone. */
async function criarEmailICloud(page, { url, endereco, modo = 'simulacao', confirmacaoReal } = {}) {
  exigirModo({ modo, confirmacaoReal });
  if (!validarEmail(endereco)) return fim('erro', 'endereço inválido');
  const S = SELETORES.icloud;
  await page.goto(url);
  if (await visivel(page, S.limite)) return fim('erro', 'limite de endereços do domínio atingido');
  await page.locator(S.adicionar).first().click();
  await page.locator(S.campo).first().fill(endereco.split('@')[0]);
  if (modo === 'real') return fim('pronto_para_enviar', 'endereço digitado; operador confere e clica em Adicionar');
  await page.locator(S.confirmar).first().click();
  if (await visivel(page, S.sucesso)) return fim('concluido', 'tela mostrou o endereço adicionado: ' + endereco);
  return fim('erro', 'confirmação não apareceu');
}

/** 3) Conta Amazon por e-mail. Para em senha, telefone obrigatório, CAPTCHA e código. */
async function criarContaAmazon(page, { url, email, nome, modo = 'simulacao', confirmacaoReal } = {}) {
  exigirModo({ modo, confirmacaoReal });
  if (!validarEmail(email)) return fim('erro', 'e-mail inválido');
  if (!nome || nome.trim().length < 3) return fim('erro', 'nome inválido');
  const S = SELETORES.amazon;
  await page.goto(url);
  if (await visivel(page, S.captcha)) return fim('intervencao', 'CAPTCHA na entrada');
  await page.locator(S.email).first().fill(email);
  await page.locator(S.continuar).first().click();
  if (await visivel(page, S.captcha)) return fim('intervencao', 'CAPTCHA após o e-mail');
  if (await visivel(page, S.telefoneObrigatorio)) {
    if (await visivel(page, S.pularTelefone)) await page.locator(S.pularTelefone).first().click();
    else return fim('exige_telefone', 'a tela exigiu celular sem opção de pular');
  }
  if (await visivel(page, S.nome)) await page.locator(S.nome).first().fill(nome.trim());
  if (await visivel(page, S.senha)) return fim('precisa_operador', 'etapa de senha: o operador digita a senha (gerenciador de senhas)');
  if (await visivel(page, S.codigo)) return fim('aguardando_codigo', 'código enviado para ' + email);
  return fim('erro', 'tela inesperada após o e-mail');
}

/** 2) Conta no app Vinci (Tuya, Android). Executada no emulador (frente do Codex). */
function roteiroContaVinci({ email }) {
  if (!validarEmail(email)) return fim('erro', 'e-mail inválido');
  return fim('precisa_operador', 'executar no Android', {
    passos: [
      'Abrir o app Vinci no emulador',
      'Tocar em Registrar e escolher cadastro por e-mail (não usar telefone)',
      'Digitar ' + email + ' e pedir o código',
      'Ler o código no e-mail e digitar (resultado: aguardando_codigo até chegar)',
      'Senha: o operador digita',
      'Evidência: print da tela inicial logada'
    ]
  });
}

module.exports = { SELETORES, RESULTADOS, validarEmail, criarEmailICloud, criarContaAmazon, roteiroContaVinci };

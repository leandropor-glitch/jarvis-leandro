// "Esqueci a senha" do Felyx (Lite, PRO e FULL): o mesmo fluxo do app — celular, código de 6 dígitos no WhatsApp
// do Felyx e senha nova — pelo n8n (felix/app: codigo → verificar → senha). Ao terminar, já devolve a sessão.
// Uso: felyxEsqueciSenha({ telefone, aoEntrar: (j) => { /* j.token, j.nome */ } })
(function () {
  const APP_URL = 'https://vinciautomacao.app.n8n.cloud/webhook/felix/app';
  const digitos = (s) => String(s || '').replace(/\D/g, '');
  async function api(acao, dados) {
    const r = await fetch(APP_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ acao }, dados)) });
    if (!r.ok) throw new Error('n8n ' + r.status);
    return r.json();
  }
  const CSS = '#felyxEsqueci{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:#050505;padding:16px;font-family:-apple-system,"SF Pro Text","Segoe UI",Roboto,sans-serif}'
    + '#felyxEsqueci .cx{width:100%;max-width:340px;display:flex;flex-direction:column;gap:12px}'
    + '#felyxEsqueci h2{margin:0 0 4px;font-size:20px;font-weight:600;color:#d6ff1a;text-align:center}'
    + '#felyxEsqueci p{margin:0;color:#9aa27a;font-size:14px;line-height:1.45;text-align:center}'
    + '#felyxEsqueci input{width:100%;box-sizing:border-box;padding:14px;border-radius:10px;border:1px solid #2a2f15;background:#101208;color:#eef7cc;font-size:16px}'
    + '#felyxEsqueci button{padding:14px;border-radius:10px;border:0;background:#d6ff1a;color:#111;font-size:16px;font-weight:600;cursor:pointer}'
    + '#felyxEsqueci button.sec{background:none;color:#9aa27a;font-weight:400;padding:6px}'
    + '#felyxEsqueci .er{min-height:1.3em;font-size:14px;color:#ff8a7a;text-align:center}#felyxEsqueci .er.ok{color:#d6ff1a}';

  window.felyxEsqueciSenha = function (opcoes) {
    opcoes = opcoes || {};
    if (document.getElementById('felyxEsqueci')) return;
    if (!document.getElementById('felyxEsqueciCss')) { const st = document.createElement('style'); st.id = 'felyxEsqueciCss'; st.textContent = CSS; document.head.appendChild(st); }
    const el = document.createElement('div'); el.id = 'felyxEsqueci';
    document.body.appendChild(el);
    let tel = digitos(opcoes.telefone), ticket = '';
    const fechar = () => el.remove();
    const msg = (t, ok) => { const e = el.querySelector('.er'); if (e) { e.textContent = t || ''; e.classList.toggle('ok', !!ok); } };

    function passoTelefone() {
      el.innerHTML = '<form class="cx"><h2>Esqueci a senha</h2><p>Mando um código no seu WhatsApp para você criar uma senha nova.</p>'
        + '<input id="feTel" type="tel" inputmode="tel" autocomplete="tel" placeholder="Seu WhatsApp (com DDD)" required>'
        + '<button type="submit">Mandar código</button><button type="button" class="sec" id="feCancelar">voltar</button><div class="er"></div></form>';
      el.querySelector('#feTel').value = tel;
      el.querySelector('#feCancelar').onclick = fechar;
      el.querySelector('form').onsubmit = async (e) => {
        e.preventDefault();
        tel = digitos(el.querySelector('#feTel').value);
        if (tel.length < 10) return msg('Digite o número com DDD.');
        msg('Mandando o código…', true);
        try {
          const j = await api('codigo', { telefone: tel });
          if (j.ok) passoCodigo((j.nome ? j.nome.split(' ')[0] + ', mandei' : 'Mandei') + ' um código de 6 dígitos no seu WhatsApp. Vale por 10 minutos.');
          else if (j.erro === 'janela') passoCodigo('Primeiro mande um "oi" para o Felyx no WhatsApp. Depois toque em reenviar o código.');
          else msg(j.mensagem || 'Esse número não está autorizado.');
        } catch (err) { msg('Sem conexão com o Felyx. Tente de novo.'); }
      };
    }

    function passoCodigo(texto) {
      el.innerHTML = '<form class="cx"><h2>Código do WhatsApp</h2><p></p>'
        + '<input id="feCod" inputmode="numeric" autocomplete="one-time-code" placeholder="6 dígitos" maxlength="6" required>'
        + '<button type="submit">Confirmar</button><button type="button" class="sec" id="feReenviar">reenviar o código</button>'
        + '<button type="button" class="sec" id="feCancelar">voltar</button><div class="er"></div></form>';
      el.querySelector('p').textContent = texto;
      el.querySelector('#feCancelar').onclick = fechar;
      el.querySelector('#feReenviar').onclick = async () => {
        msg('Reenviando…', true);
        try { const j = await api('codigo', { telefone: tel }); msg(j.ok ? 'Código reenviado.' : (j.mensagem || 'Não deu certo.'), j.ok); } catch (err) { msg('Sem conexão.'); }
      };
      const campo = el.querySelector('#feCod');
      campo.oninput = () => { campo.value = digitos(campo.value).slice(0, 6); };
      el.querySelector('form').onsubmit = async (e) => {
        e.preventDefault();
        try {
          const j = await api('verificar', { telefone: tel, codigo: campo.value });
          if (j.ok) { ticket = j.ticket; passoSenha(); } else { msg(j.mensagem || 'Código incorreto.'); campo.value = ''; }
        } catch (err) { msg('Sem conexão.'); }
      };
    }

    function passoSenha() {
      el.innerHTML = '<form class="cx"><h2>Senha nova</h2><p>Vale para o app, o Lite, o PRO e o FULL.</p>'
        + '<input id="feS1" type="password" autocomplete="new-password" placeholder="Senha nova (mínimo 6)" required>'
        + '<input id="feS2" type="password" autocomplete="new-password" placeholder="Repita a senha" required>'
        + '<button type="submit">Salvar e entrar</button><div class="er"></div></form>';
      el.querySelector('form').onsubmit = async (e) => {
        e.preventDefault();
        const a = el.querySelector('#feS1').value, b = el.querySelector('#feS2').value;
        if (a.length < 6) return msg('Mínimo de 6 caracteres.');
        if (a !== b) return msg('As senhas não são iguais.');
        try {
          const j = await api('senha', { telefone: tel, ticket, senha: a, aparelho: opcoes.aparelho || 'Felyx web' });
          if (j.ok) { try { localStorage.setItem('felyx_nome', j.nome || ''); } catch (x) {} fechar(); if (opcoes.aoEntrar) opcoes.aoEntrar(j); } else msg(j.mensagem || 'Não deu certo.');
        } catch (err) { msg('Sem conexão.'); }
      };
    }

    passoTelefone();
  };
})();

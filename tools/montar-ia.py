#!/usr/bin/env python3
"""Gera a página de cada IA (Leda, Leo) a partir da página do Felyx (app/).

Ordem do Leandro, 27/11/2026: "exatamente o layout do Felyx", com a paleta, o avatar, o microfone e as abas de
cada IA, e o mesmo fluxo do Felyx (Gemini Live + n8n). A aba principal mostra só o rosto/desenho; o Dashboard
mostra tudo o que a IA tem; Ambientes mostra só a casa.

Uso:  tools/montar-ia.py leda <full.html atual da Leda>
      tools/montar-ia.py leo  <full.html atual do Leo> <full.html do Leo no corte 4377b3a>
Rodar de novo sempre que a página do Felyx mudar. Nada é editado à mão na página gerada.
"""
import json, pathlib, re, shutil, sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
ia = sys.argv[1]
VISUAL = pathlib.Path(sys.argv[2]).read_text()                       # página atual da IA: paleta, avatar, abas
PERSONA = pathlib.Path(sys.argv[3] if len(sys.argv) > 3 else sys.argv[2]).read_text()   # instrução e nome

CFG = {
    'leda': dict(dir='app-leda', nome='Leda', artigo='a', voz='Sulafat',
                 acento='#c98a4b', rgb='201,138,75',
                 rotas={'/felix/app': '/leda/app', '/felix/token': '/leda/token', '/felix/gemini-apoio': '/leda/gemini-apoio'},
                 api='https://ia.uservinci.com/api', forma='quadrado'),
    'leo': dict(dir='app-leo', nome='Leo', artigo='o', voz='Charon',
                acento=None, rgb=None, rotas={}, api=None, forma='quadrado'),
}[ia]
NOME, ART = CFG['nome'], CFG['artigo']
D = RAIZ / CFG['dir']
BASE = D / 'base'
BASE.mkdir(parents=True, exist_ok=True)
F = (RAIZ / 'app' / 'full.html').read_text()


def bloco(txt, padrao, oque, flags=re.S):
    m = re.search(padrao, txt, flags)
    if not m:
        raise SystemExit('não achei: ' + oque)
    return m


def comum(t):
    """Trocas que valem para a página e para cada script/css copiado."""
    for a, b in CFG['rotas'].items():
        t = t.replace(a, b)
    if CFG['api']:
        t = t.replace('https://ia.uservinci.com/api/felyx-pre-vps', CFG['api'])
    img = {'leda': 'leda-rosto.jpg', 'leo': 'animacao/aprovadas/01-icone-aprovado-vitruviano.png'}[ia]
    t = t.replace('felyx-retrato-16x9.jpg', img).replace('felyx-retrato.jpg', img)
    t = t.replace('felyx_sessao', ia + '_sessao')                      # no GitHub todas as IAs têm a mesma origem:
    t = re.sub(r"(['\"`])felyx\.", lambda m: m.group(1) + ia + '.', t)   # cada uma guarda a própria sessão e preferências
    if CFG['acento']:
        t = t.replace('#d6ff1a', CFG['acento']).replace('#D6FF1A', CFG['acento'])
        for neon in ('225,254,6', '214,255,26', '225, 254, 6', '214, 255, 26'):
            t = t.replace(neon, CFG['rgb'])
    return t


def copiar(m):
    """Scripts e css locais viram cópia própria da IA em base/, com rotas, chaves e cor da IA."""
    attr, src = m.group(1), m.group(2)
    limpo = src.split('?')[0]
    if limpo.startswith(('http', '/')):
        return m.group(0)
    origem = (RAIZ / 'app' / limpo).resolve()
    if not origem.exists():
        return m.group(0)
    if origem.suffix in ('.js', '.css', '.mjs'):
        (BASE / origem.name).write_text(comum(origem.read_text()))
    else:
        shutil.copy2(origem, BASE / origem.name)
    return f'{attr}="base/{origem.name}?v=20261127{ia}"'


def trocar_const(out, nome, fonte):
    pat = r'const ' + nome + r'\s*=\s*[^\n]*;[^\n]*\n'
    de = bloco(fonte, pat, nome + ' na fonte').group(0)
    para = bloco(out, pat, nome + ' na base')
    return out[:para.start()] + de + out[para.end():]


def trocar_card_casa4d(out, html):
    c4 = bloco(out, r'<section class="panel casa4d" id="casa4dP".*?</section>', 'card Casa 4D')
    return out[:c4.start()] + html + out[c4.end():]


def abrir_aba_pelo_card(out, id_link, aba):
    return out.replace('</body>', """<script>
// 27/11/2026: o card do Dashboard abre a aba própria da IA
(function(){ var a=document.getElementById('%s'); if(!a) return;
  a.addEventListener('click',function(e){ e.preventDefault(); var b=document.querySelector('[data-tab-target="%s"]'); if(b) b.click(); });
})();
</script>
</body>""" % (id_link, aba), 1)


out = re.sub(r'<script src="/telemetry\.js"></script>', '', F)
out = re.sub(r'\b(src|href)="([^"#]+\.(?:js|css)(?:\?[^"]*)?)"', copiar, out)
out = comum(out)

# abas da IA
navF = bloco(out, r'<nav class="appTabs".*?</nav>', 'abas do Felyx')
navI = bloco(VISUAL, r'<nav class="appTabs".*?</nav>', 'abas da IA').group(0)
antes_nav = '<section id="receitas" aria-label="Receitas e boas práticas do lar"></section>\n  ' if ia == 'leda' else ''
out = out[:navF.start()] + antes_nav + navI + out[navF.end():]

# instrução, cumprimento, reconhecimento do nome e voz
sysP = bloco(PERSONA, r'const SYSTEM\s*=\s*`.*?`;', 'SYSTEM da IA').group(0)
sysF = bloco(out, r'const SYSTEM\s*=\s*`.*?`;', 'SYSTEM do Felyx')
out = out[:sysF.start()] + sysP + out[sysF.end():]
for c in ('OPENING', 'CHAMA_FELIX', 'SO_O_NOME'):
    out = trocar_const(out, c, PERSONA)
out = re.sub(r"const VOICE\s*=\s*'[A-Za-z]+'", "const VOICE = '%s'" % CFG['voz'], out)
out = out.replace('Algieba', CFG['voz'])
out = out.replace("'Ninguém chamou o Félix. Não diga nada.'", "'Ninguém chamou %s %s. Não diga nada.'" % (ART, NOME))

if ia == 'leda':
    vis = bloco(VISUAL, r'<style id="ledaVisual">(.*?)</style>', 'ledaVisual').group(1)
    vis = vis.replace('#market,.panel.market{display:none!important}', '')   # 27/11: a Leda mostra todos os cards
    extra = """
/* 27/11/2026: layout do Felyx na paleta da Leda */
:root{--bg:#291b16;--ink:#f3e8dc;--muted:#bfa38b;--line:rgba(201,138,75,.22);--grid:rgba(201,138,75,.05);--accent:#c98a4b;--accent-rgb:201,138,75;--accent-ink:#2a1b15}
#hud .panel{background:linear-gradient(180deg,#34231c,#2c1d17)!important;border-color:rgba(201,138,75,.38)!important}
#hud .panel .ph .k i,#hud .panel .dots i.on{background:var(--leda)!important}
#receitaP .c4dBtn{background:var(--cobre)!important;color:#2a1b15!important}
"""
    out = out.replace('</head>', '<style id="ledaVisual">' + vis + extra + '</style>\n</head>', 1)
    scr = bloco(VISUAL, r'<script>((?:(?!</script>).)*RECEITAS_PADRAO.*?)</script>', 'bloco de receitas').group(1)
    out = out.replace('</head>', '<script>' + comum(scr) + '</script>\n</head>', 1)
    face = bloco(out, r'<div class="face">', 'rosto')
    out = (out[:face.end()] + '<img class="ledaBusto" src="leda-busto.jpg?v=20261127" decoding="sync" alt="Leda" draggable="false">'
           '<img class="ledaRosto" src="leda-rosto.jpg?v=20261127" alt="" draggable="false">' + out[face.end():])
    out = trocar_card_casa4d(out, '<section class="panel casa4d" id="receitaP" aria-label="Receitas">\n        <div class="ph"><span class="k"><i></i>receitas</span>'
                                  '<span class="pr" id="receitaDia">da cozinha da leda</span></div>\n        <a class="c4dBtn" href="#" id="receitaAbrir">Abrir as receitas da Leda</a>\n      </section>')
    out = abrir_aba_pelo_card(out, 'receitaAbrir', 'receitas')
    out = out.replace('</body>', """<script>
try{ var l=(window.ledaReceitas&&window.ledaReceitas.lista())||[]; if(l.length){ var r=l[new Date().getDate()%l.length]; var d=document.getElementById('receitaDia'); if(d&&r&&r.nome) d.textContent='hoje: '+String(r.nome).toLowerCase(); } }catch(e){}
</script>
</body>""", 1)
    fundo_login = '#291b16'

if ia == 'leo':
    logo = bloco(VISUAL, r'<style id="leoLogo">(.*?)</style>', 'leoLogo').group(1)
    ajustes = (RAIZ / CFG['dir'] / 'leo-ajustes-20261126.css')
    face_css = ''
    if ajustes.exists():
        face_css = bloco(ajustes.read_text(), r'\.face \.leoMarca \.leo-media \{.*?\.is-playing \{ opacity: 1; \}', 'regras do rosto do Leo').group(0)
    extra = """
/* 27/11/2026: layout do Felyx com o Leo (logo Vitruviano no lugar do rosto; 4 abas) */
html body #hud .appTabs{grid-template-columns:repeat(4,minmax(0,1fr))!important}
#hud[data-tab="dashboard"] .face .leoMarca .leo-media{width:100%}
"""
    out = out.replace('</head>', '<style id="leoLogo">' + logo + face_css + extra + '</style>\n</head>', 1)
    marca = bloco(VISUAL, r'<div class="leoMarca".*?</div>\s*</div>', 'logo do Leo').group(0)
    face = bloco(out, r'<div class="face">', 'rosto')
    out = out[:face.end()] + marca + out[face.end():]
    out = trocar_card_casa4d(out, '<section class="panel casa4d" id="noticiasP" aria-label="Notícias">\n        <div class="ph"><span class="k"><i></i>notícias</span>'
                                  '<span class="pr">política · tecnologia</span></div>\n        <a class="c4dBtn" href="#" id="noticiasAbrir">Abrir as notícias do Leo</a>\n      </section>')
    out = abrir_aba_pelo_card(out, 'noticiasAbrir', 'news')
    out = out.replace('</body>', '<script src="animacao/leo-galeria.js?v=20261127"></script>\n</body>', 1)
    fundo_login = '#000000'

# sem foto do Felyx em lugar nenhum: o retrato vira a imagem da IA e fica escondido; card próprio só no Dashboard
IMG = {'leda': 'leda-rosto.jpg', 'leo': 'animacao/aprovadas/01-icone-aprovado-vitruviano.png'}[ia]
out = out.replace('felyx-retrato-16x9.jpg', IMG).replace('felyx-retrato.jpg', IMG)
out = out.replace('</head>', '<style id="iaCards">html body #hud[data-tab] .face img.retrato,html body #hud.com-rosto[data-tab] .face img.retrato{display:none!important}'
                  '#hud:not([data-tab="dashboard"]) #receitaP,#hud:not([data-tab="dashboard"]) #noticiasP{display:none!important}</style>\n</head>', 1)

for a, b in (('Fale com o Felyx', 'Fale com %s %s' % (ART, NOME)), ('felyx · vinci ai', NOME.lower() + ' · vinci ai'), ('>Felyx<', '>%s<' % NOME),
             ('<title>Felyx', '<title>' + NOME), ('data-ia="felyx"', 'data-ia="%s"' % ia), ('aria-label="Felyx"', 'aria-label="%s"' % NOME),
             ('data-forma="quadrado"', 'data-forma="%s"' % CFG['forma'])):
    out = out.replace(a, b)
(D / 'full.html').write_text(out)

# página de entrada (login) no mesmo padrão do Felyx
I = (RAIZ / 'app' / 'index.html').read_text()
I = re.sub(r'\b(src|href)="([^"#]+\.(?:js|css)(?:\?[^"]*)?)"', copiar, I)
I = comum(I)
for a, b in (('Felyx', NOME), ('Félix', NOME), ('felyx · vinci ai', NOME.lower() + ' · vinci ai')):
    I = I.replace(a, b)
if CFG['acento']:
    I = I.replace('</head>', '<style>:root{--bg:%s;--accent:%s;--accent-rgb:%s;--accent-ink:#2a1b15}html,body{background:%s!important}</style>\n</head>'
                  % (fundo_login, CFG['acento'], CFG['rgb'], fundo_login), 1)
(D / 'index.html').write_text(I)

sobras = sorted(set(re.findall(r'.{28}(?:Felyx|Félix).{28}', re.sub(r'data:[a-z/+]+;base64,[A-Za-z0-9+/=]+', '', out))))
print(json.dumps({'ia': ia, 'full': len(out), 'index': len(I), 'base': len(list(BASE.iterdir())), 'mencoes_felyx_restantes': len(sobras)}, ensure_ascii=False))

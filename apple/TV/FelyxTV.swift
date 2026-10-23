import SwiftUI

/// Apple TV: não tem navegador embutido, então é um app nativo no desenho aprovado
/// (saudação, cenas da casa, notícias). Perguntas pelo controle usam o ditado do teclado da TV.
@main
struct FelyxTVApp: App {
    @StateObject private var m = ModeloTV()
    var body: some Scene {
        WindowGroup {
            Group {
                if !m.logado { LoginTV() } else if !m.iaPerguntada { PermissaoTV() } else { InicioTV() }
            }
            .environmentObject(m)
            .preferredColorScheme(.dark)
        }
    }
}

let acento = Color(red: 0.84, green: 1.0, blue: 0.10)
let fundoCard = Color(red: 0.08, green: 0.09, blue: 0.11)
let cinza = Color(red: 0.54, green: 0.55, blue: 0.53)

struct Noticia: Decodable, Hashable { var title: String; var source: String?; var link: String? }

@MainActor
final class ModeloTV: ObservableObject {
    @Published var logado = Sessao.token != nil
    @Published var nome = Sessao.nome ?? ""
    @Published var cenas: [String] = []
    @Published var noticias: [(String, Noticia)] = []
    @Published var resumo = "Carregando…"
    @Published var aviso: String?
    @Published var lendo: String?
    @Published var iaPerguntada = Consentimento.perguntado
    @Published var iaAceita = Consentimento.aceito
    let voz = VozTV()

    var primeiroNome: String { nome.split(separator: " ").first.map(String.init) ?? "" }
    var saudacao: String { let h = Calendar.current.component(.hour, from: Date()); return h >= 5 && h < 12 ? "Bom dia" : (h >= 12 && h < 18 ? "Boa tarde" : "Boa noite") }

    func carregar() async {
        guard let token = Sessao.token else { return }
        if let r = try? await FelyxAPI.app("casa", ["token": token]) {
            if r.erro == "sessao" { sair(); return }
            let fav = ["TV Sala", "Luz Alta", "Luz Baixa", "Sanca", "Apple TV", "Boa Noite"]
            let todas = r.cenas ?? []
            cenas = fav.filter { todas.contains($0) } + todas.filter { !fav.contains($0) }
        }
        struct N: Decodable { var ok: Bool?; var politica: [Noticia]?; var tecnologia: [Noticia]? }
        if let n = try? await FelyxAPI.get("felix/noticias", como: N.self) {
            let t = (n.tecnologia ?? []).prefix(4).map { ("TECNOLOGIA", $0) }, p = (n.politica ?? []).prefix(4).map { ("POLÍTICA", $0) }
            var mix: [(String, Noticia)] = []
            for i in 0..<max(t.count, p.count) { if i < t.count { mix.append(t[i]) }; if i < p.count { mix.append(p[i]) } }
            noticias = mix
        }
        struct M: Decodable { struct U: Decodable { var preco: Double? }; var usdtbrl: U? }
        let dolar = (try? await FelyxAPI.get("felix/mercado", como: M.self))?.usdtbrl?.preco
        let dolarTxt = dolar.map { "O dólar está em R$ " + String(format: "%.2f", $0).replacingOccurrences(of: ".", with: ",") + ". " } ?? ""
        resumo = dolarTxt + (noticias.first.map { "O destaque do dia: \($0.1.title)." } ?? "")
    }

    func cena(_ c: String) async { aviso = "Ativando \(c)…"; aviso = await FelyxAPI.comandar("ativa a cena \(c)") }
    func explicar(_ n: Noticia) async {
        voz.parar()
        lendo = "Lendo a matéria…"
        let r = await FelyxAPI.perguntar("Abra e resuma esta notícia do painel: \"\(n.title)\"" + (n.source.map { " (\($0))" } ?? "") + (n.link.map { " — \($0)" } ?? ""))
        responder(r)
    }
    func perguntar(_ p: String) async {
        voz.parar()
        lendo = "Consultando o cérebro…"
        responder(await FelyxAPI.perguntar(p))
    }
    /// Mostra a resposta e a lê em voz alta com a voz Algieba (se a permissão de IA estiver dada).
    private func responder(_ r: String) { lendo = r; voz.falar(r) }
    func entrou(token: String, nome: String) { Sessao.salvar(token: token, nome: nome); self.nome = nome; logado = true }
    func sair() { if let t = Sessao.token { Task { _ = try? await FelyxAPI.app("sair", ["token": t]) } }; Sessao.limpar(); Consentimento.limpar(); iaPerguntada = false; iaAceita = false; voz.parar(); logado = false }
    func responderIA(_ v: Bool) { Consentimento.gravar(v); iaAceita = v; iaPerguntada = true; if !v { voz.parar() } }
}

struct InicioTV: View {
    @EnvironmentObject var m: ModeloTV
    @State private var pergunta = ""
    var body: some View {
        ZStack(alignment: .topLeading) {
            Color.black.ignoresSafeArea()
            Image("Rosto").resizable().scaledToFill().frame(width: 1500, height: 845).clipped()
                .mask(LinearGradient(colors: [.black, .black, .clear], startPoint: .top, endPoint: .bottom))
                .offset(x: 580).ignoresSafeArea()
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    Text("FELYX · VINCI AI").font(.system(size: 24, design: .monospaced)).tracking(6).foregroundStyle(cinza)
                    Text("\(m.saudacao), \(m.primeiroNome).").font(.system(size: 84, weight: .medium))
                    Text(m.resumo).font(.system(size: 32)).foregroundStyle(Color(white: 0.8)).frame(maxWidth: 760, alignment: .leading)
                    if let a = m.aviso { Text(a).font(.system(size: 26)).foregroundStyle(acento) }
                    Spacer(minLength: 120)
                    Text("CENAS").font(.system(size: 22, design: .monospaced)).tracking(4).foregroundStyle(cinza)
                    ScrollView(.horizontal) {
                        HStack(spacing: 28) {
                            ForEach(m.cenas, id: \.self) { c in
                                Button { Task { await m.cena(c) } } label: { Text(c).font(.system(size: 32, weight: .medium)).frame(width: 260, height: 150) }
                                    .buttonStyle(.card)
                            }
                        }.padding(.vertical, 30)
                    }
                    Text("NOTÍCIAS").font(.system(size: 22, design: .monospaced)).tracking(4).foregroundStyle(cinza)
                    ScrollView(.horizontal) {
                        HStack(spacing: 28) {
                            ForEach(m.noticias, id: \.1) { (tag, n) in
                                Button { Task { await m.explicar(n) } } label: {
                                    VStack(alignment: .leading, spacing: 10) {
                                        Text(tag + (n.source.map { " · " + $0.uppercased() } ?? "")).font(.system(size: 18, design: .monospaced)).foregroundStyle(cinza)
                                        Text(n.title).font(.system(size: 26)).lineLimit(3).multilineTextAlignment(.leading)
                                    }.padding(26).frame(width: 560, height: 180, alignment: .topLeading)
                                }.buttonStyle(.card)
                            }
                        }.padding(.vertical, 30)
                    }
                    HStack(spacing: 24) {
                        TextField("Pergunte ao Felyx (segure o botão do microfone do controle para ditar)", text: $pergunta)
                            .onSubmit { let p = pergunta; pergunta = ""; Task { await m.perguntar(p) } }
                        Button(m.iaAceita ? "Desligar IA" : "Permitir IA") { m.responderIA(!m.iaAceita) }
                        Button("Sair") { m.sair() }
                    }.padding(.top, 20)
                }.padding(.horizontal, 90).padding(.vertical, 60)
            }
        }
        .task { await m.carregar() }
        .sheet(isPresented: Binding(get: { m.lendo != nil }, set: { if !$0 { m.lendo = nil; m.voz.parar() } })) {
            ScrollView { Text(m.lendo ?? "").font(.system(size: 34)).padding(80).frame(maxWidth: 1400, alignment: .leading) }
        }
    }
}

/// Antes de qualquer pergunta: o que vai para cada serviço de IA, e o pedido de permissão.
struct PermissaoTV: View {
    @EnvironmentObject var m: ModeloTV
    var body: some View {
        VStack(alignment: .leading, spacing: 30) {
            Text("FELYX · VINCI AI").font(.system(size: 24, design: .monospaced)).tracking(6).foregroundStyle(cinza)
            Text("Antes de conversar").font(.system(size: 64, weight: .medium))
            Text("Para responder, o Felyx usa serviços de inteligência artificial de outras empresas. Com a sua permissão, o texto do que você pergunta (escrito ou ditado) e o seu primeiro nome vão para a Anthropic (Claude), pelo servidor da Vinci (n8n), para gerar a resposta; e o texto da resposta vai para o Google (Gemini), para ser lido com a voz do Felyx. Nada disso é usado para anúncios nem vendido.")
                .font(.system(size: 30)).foregroundStyle(Color(white: 0.8)).frame(maxWidth: 1300, alignment: .leading)
            Text("Sem a permissão, as cenas da casa e as notícias continuam funcionando; só as perguntas e a voz do Felyx ficam desligadas.")
                .font(.system(size: 26)).foregroundStyle(cinza).frame(maxWidth: 1300, alignment: .leading)
            HStack(spacing: 30) {
                Button("Permitir") { m.responderIA(true) }
                Button("Agora não") { m.responderIA(false) }
            }
        }.padding(90)
    }
}

struct LoginTV: View {
    @EnvironmentObject var m: ModeloTV
    @State private var tel = ""
    @State private var senha = ""
    @State private var codigo = ""
    @State private var nova = ""
    @State private var etapa = 0   // 0 telefone e senha, 1 código, 2 nova senha
    @State private var ticket = ""
    @State private var msg = ""
    var body: some View {
        HStack(spacing: 80) {
            Image("Rosto").resizable().scaledToFill().frame(width: 760, height: 760).clipShape(RoundedRectangle(cornerRadius: 40))
            VStack(alignment: .leading, spacing: 30) {
                Text("FELYX · VINCI AI").font(.system(size: 24, design: .monospaced)).tracking(6).foregroundStyle(cinza)
                if etapa == 0 {
                    Text("Entrar").font(.system(size: 64, weight: .medium))
                    TextField("Celular com DDD", text: $tel).keyboardType(.phonePad)
                    SecureField("Senha", text: $senha)
                    Button("Entrar") { Task { await entrar() } }
                    Button("Primeiro acesso ou esqueci a senha") { Task { await pedirCodigo() } }
                } else if etapa == 1 {
                    Text("Código do WhatsApp").font(.system(size: 54, weight: .medium))
                    TextField("6 dígitos", text: $codigo).keyboardType(.numberPad)
                    Button("Confirmar") { Task { await verificar() } }
                    Button("Voltar") { etapa = 0 }
                } else {
                    Text("Crie sua senha").font(.system(size: 54, weight: .medium))
                    SecureField("Nova senha (mínimo 6)", text: $nova)
                    Button("Salvar e entrar") { Task { await criarSenha() } }
                }
                Text(msg).font(.system(size: 26)).foregroundStyle(acento)
            }.frame(width: 820)
        }.padding(90)
    }
    private var digitos: String { tel.filter(\.isNumber) }
    private func entrar() async {
        guard let r = try? await FelyxAPI.app("entrar", ["telefone": digitos, "senha": senha, "aparelho": "Apple TV"]) else { msg = "Sem conexão."; return }
        if r.ok == true, let t = r.token { m.entrou(token: t, nome: r.nome ?? "") }
        else if r.erro == "sem_senha" { msg = "Você ainda não tem senha. Escolha \"Primeiro acesso\"." } else { msg = r.mensagem ?? "Não deu certo." }
    }
    private func pedirCodigo() async {
        guard let r = try? await FelyxAPI.app("codigo", ["telefone": digitos]) else { msg = "Sem conexão."; return }
        msg = r.mensagem ?? (r.ok == true ? "Mandei o código no seu WhatsApp." : "")
        if r.ok == true || r.erro == "janela" { etapa = 1 }
    }
    private func verificar() async {
        guard let r = try? await FelyxAPI.app("verificar", ["telefone": digitos, "codigo": codigo]) else { msg = "Sem conexão."; return }
        if r.ok == true, let t = r.ticket { ticket = t; etapa = 2; msg = "" } else { msg = r.mensagem ?? "Código incorreto." }
    }
    private func criarSenha() async {
        guard let r = try? await FelyxAPI.app("senha", ["telefone": digitos, "ticket": ticket, "senha": nova, "aparelho": "Apple TV"]) else { msg = "Sem conexão."; return }
        if r.ok == true, let t = r.token { m.entrou(token: t, nome: r.nome ?? "") } else { msg = r.mensagem ?? "Não deu certo." }
    }
}

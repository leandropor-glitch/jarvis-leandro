import SwiftUI

/// Apple TV: não tem navegador embutido, então é um app nativo com o desenho do Felyx Full no iPhone deitado
/// (rosto, microfone na lateral, abas Home / Dashboard / Salas). Perguntas pelo controle usam o ditado do teclado da TV.
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
    @Published var comodos = ComodosCfg()
    let voz = VozTV()

    #if DEBUG
    /// Só para testar o desenho no simulador (argumento -demo): entra sem login, com as cenas básicas.
    init() {
        if ProcessInfo.processInfo.arguments.contains("-demo") {
            logado = true; nome = "Leandro"; iaPerguntada = true; resumo = "O dólar está em R$ 5,31. O destaque do dia: teste."
            cenas = ["Luz Alta", "Luz Baixa", "Sanca", "OFF_Sala", "TV Sala", "Apple TV", "PlayStation", "Globo", "Música", "Mudo", "AC Sala", "AC Suíte", "Cozinha", "Bancada", "Cama", "Closet", "TV Suíte", "Master OFF", "Boa Noite", "Estante Felipe"]
        }
    }
    #endif

    var primeiroNome: String { nome.split(separator: " ").first.map(String.init) ?? "" }
    var saudacao: String { let h = Calendar.current.component(.hour, from: Date()); return h >= 5 && h < 12 ? "Bom dia" : (h >= 12 && h < 18 ? "Boa tarde" : "Boa noite") }

    func carregar() async {
        if let (d, _) = try? await URLSession.shared.data(from: Self.urlComodos), let c = try? JSONDecoder().decode(ComodosCfg.self, from: d) { comodos = c }
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

    func cena(_ c: String) async {
        aviso = "Ativando \(c)…"
        let r = await FelyxAPI.comandar("ativa a cena \(c)"); aviso = r
        try? await Task.sleep(for: .seconds(4)); if aviso == r { aviso = nil }
    }
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

// MARK: - Tela principal (12/11/2026): igual ao Felyx Full no iPhone deitado.
// Fundo preto, só o rosto humano do Felyx na Home, microfone na lateral direita com "Fale com o Felyx",
// abas Home / Dashboard / Salas embaixo. Nada na frente do rosto. O foco do controle começa no microfone.

let neon = Color(red: 225/255, green: 254/255, blue: 6/255)

enum AbaTV: String, CaseIterable, Hashable { case home = "Home", dashboard = "Dashboard", salas = "Salas" }

/// Cômodos do mesmo arquivo que o app usa (vinci/comodos.json): cada cena vai para o primeiro cômodo cuja palavra aparece no nome.
struct ComodosCfg: Decodable {
    struct Comodo: Decodable { var nome: String; var cor: String?; var palavras: [String]? }
    var comodos: [Comodo]?
    var ordemTela: [String]?
    var fixos: [String: String]?
    var semComodo: String?

    static func normal(_ s: String) -> String { s.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: .init(identifier: "pt_BR")) }
    func sala(_ cena: String) -> String {
        if let f = fixos?[cena + "|CENA"] ?? fixos?[cena] { return f }
        let n = Self.normal(cena)
        let palavras = n.split(whereSeparator: { !$0.isLetter && !$0.isNumber }).map(String.init)
        for c in comodos ?? [] {
            if (c.palavras ?? []).contains(where: { p in let q = Self.normal(p); return q.count <= 3 ? palavras.contains(q) : n.contains(q) }) { return c.nome }
        }
        return semComodo ?? "Outros"
    }
    func ordem(_ salas: Set<String>) -> [String] {
        let base = (ordemTela ?? []) + (comodos ?? []).map(\.nome) + [semComodo ?? "Outros"]
        var vistas = Set<String>()
        return base.filter { salas.contains($0) && vistas.insert($0).inserted }
    }
}

extension ModeloTV {
    static let urlComodos = URL(string: "https://leandropor-glitch.github.io/jarvis-leandro/vinci/comodos.json")!
}

/// Botão da TV no padrão do Full: escuro em repouso, neon quando o controle está em cima.
struct EstiloFelyx: ButtonStyle {
    var raio: CGFloat = 20
    var selecionado = false
    func makeBody(configuration: Configuration) -> some View { Corpo(configuration: configuration, raio: raio, selecionado: selecionado) }
    struct Corpo: View {
        let configuration: Configuration; let raio: CGFloat; let selecionado: Bool
        @Environment(\.isFocused) private var focado
        var body: some View {
            configuration.label
                .foregroundStyle(focado ? Color.black : (selecionado ? neon : Color.white))
                .background(RoundedRectangle(cornerRadius: raio).fill(focado ? neon : fundoCard))
                .overlay(RoundedRectangle(cornerRadius: raio).stroke(selecionado && !focado ? neon : Color.white.opacity(0.12), lineWidth: selecionado ? 3 : 1))
                .shadow(color: focado ? neon.opacity(0.45) : .clear, radius: 24)
                .scaleEffect(configuration.isPressed ? 0.97 : (focado ? 1.06 : 1))
                .animation(.easeOut(duration: 0.15), value: focado)
        }
    }
}

/// O microfone do Full: círculo com o ícone, neon quando focado.
struct EstiloMic: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View { Corpo(configuration: configuration) }
    struct Corpo: View {
        let configuration: Configuration
        @Environment(\.isFocused) private var focado
        var body: some View {
            configuration.label
                .foregroundStyle(focado ? Color.black : neon)
                .frame(width: 150, height: 150)
                .background(Circle().fill(focado ? neon : Color(red: 0.05, green: 0.06, blue: 0.07)))
                .overlay(Circle().stroke(neon, lineWidth: 3))
                .shadow(color: neon.opacity(focado ? 0.7 : 0.25), radius: focado ? 40 : 16)
                .scaleEffect(configuration.isPressed ? 0.95 : (focado ? 1.1 : 1))
                .animation(.easeOut(duration: 0.15), value: focado)
        }
    }
}

/// Campo invisível que abre direto o teclado da TV (onde se segura o botão do microfone do controle para ditar).
struct CampoDitado: UIViewRepresentable {
    @Binding var ativo: Bool
    var enviar: (String) -> Void
    final class Campo: UITextField { override var canBecomeFocused: Bool { false } }
    func makeUIView(context: Context) -> Campo {
        let t = Campo()
        t.placeholder = "Fale com o Felyx: segure o botão do microfone do controle"
        t.returnKeyType = .send
        t.alpha = 0.01
        t.clipsToBounds = true
        t.delegate = context.coordinator
        return t
    }
    func updateUIView(_ t: Campo, context: Context) {
        context.coordinator.pai = self
        if ativo && !t.isFirstResponder { DispatchQueue.main.async { t.text = ""; t.becomeFirstResponder() } }
    }
    func makeCoordinator() -> Coord { Coord(pai: self) }
    final class Coord: NSObject, UITextFieldDelegate {
        var pai: CampoDitado
        init(pai: CampoDitado) { self.pai = pai }
        func textFieldDidEndEditing(_ t: UITextField) {
            let p = (t.text ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
            t.text = ""
            pai.ativo = false
            if !p.isEmpty { pai.enviar(p) }
        }
    }
}

struct InicioTV: View {
    @EnvironmentObject var m: ModeloTV
    @State private var aba: AbaTV = .home
    @State private var ditando = false
    @State private var sala = ""
    @FocusState private var foco: Alvo?
    enum Alvo: Hashable { case mic, aba(AbaTV) }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            VStack(spacing: 0) {
                HStack(spacing: 0) {
                    ZStack(alignment: .bottom) {
                        conteudo.frame(maxWidth: .infinity, maxHeight: .infinity)
                        legenda
                    }
                    colunaMic
                }
                barraAbas
            }
            CampoDitado(ativo: $ditando) { p in Task { await m.perguntar(p) } }.frame(width: 1, height: 1).clipped().opacity(0.01)
        }
        .defaultFocus($foco, .mic)
        .task { await m.carregar() }
        .onExitCommand(perform: m.lendo != nil ? { m.lendo = nil; m.voz.parar() } : nil)
    }

    // Home: só o rosto, inteiro, centrado no espaço livre (a mesma foto 16:9 do LiveAvatar).
    @ViewBuilder private var conteudo: some View {
        switch aba {
        case .home:
            Image("Retrato").resizable().scaledToFit().padding(.top, 20)
        case .dashboard:
            Dashboard()
        case .salas:
            Salas(sala: $sala)
        }
    }

    // Resposta do Felyx como legenda embaixo, sem cobrir o rosto. O botão Menu do controle fecha.
    @ViewBuilder private var legenda: some View {
        if let t = m.lendo ?? m.aviso {
            Text(t)
                .font(.system(size: 32))
                .foregroundStyle(.white)
                .lineLimit(6).minimumScaleFactor(0.7)
                .multilineTextAlignment(.leading)
                .padding(.horizontal, 36).padding(.vertical, 24)
                .frame(maxWidth: 1250, alignment: .leading)
                .background(RoundedRectangle(cornerRadius: 24).fill(Color.black.opacity(0.78)))
                .overlay(RoundedRectangle(cornerRadius: 24).stroke(Color.white.opacity(0.1)))
                .padding(.bottom, 24)
                .transition(.opacity)
        }
    }

    private var colunaMic: some View {
        VStack(spacing: 22) {
            Spacer()
            Button { ditando = true } label: { Image(systemName: "mic.fill").font(.system(size: 60, weight: .semibold)) }
                .buttonStyle(EstiloMic())
                .focused($foco, equals: .mic)
            Text("Fale com o Felyx")
                .font(.system(size: 30, weight: .bold))
                .foregroundStyle(neon)
                .shadow(color: neon.opacity(0.75), radius: 6)
                .shadow(color: neon.opacity(0.45), radius: 18)
            Spacer()
        }
        .frame(width: 330)
        .focusSection()
    }

    private var barraAbas: some View {
        HStack(spacing: 24) {
            ForEach(AbaTV.allCases, id: \.self) { a in
                Button { aba = a } label: {
                    Text(a.rawValue.uppercased()).font(.system(size: 26, weight: .semibold, design: .monospaced)).tracking(3)
                        .frame(maxWidth: .infinity).frame(height: 78)
                }
                .buttonStyle(EstiloFelyx(raio: 18, selecionado: aba == a))
                .focused($foco, equals: .aba(a))
            }
        }
        .padding(.horizontal, 80).padding(.top, 18).padding(.bottom, 40)
        .background(Color(red: 8/255, green: 9/255, blue: 11/255).opacity(0.96))
        .overlay(Rectangle().fill(Color.white.opacity(0.1)).frame(height: 1), alignment: .top)
        .focusSection()
    }
}

/// Dashboard: o rosto pequeno com a saudação, os botões das cenas e as notícias.
struct Dashboard: View {
    @EnvironmentObject var m: ModeloTV
    private let colunas = Array(repeating: GridItem(.flexible(), spacing: 30), count: 4)
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 34) {
                HStack(spacing: 36) {
                    Image("Rosto").resizable().scaledToFill().frame(width: 170, height: 170).clipShape(Circle())
                        .overlay(Circle().stroke(Color.white.opacity(0.1)))
                    VStack(alignment: .leading, spacing: 10) {
                        Text("\(m.saudacao), \(m.primeiroNome).").font(.system(size: 54, weight: .medium))
                        Text(m.resumo).font(.system(size: 26)).foregroundStyle(Color(white: 0.75)).lineLimit(2)
                    }
                }
                LazyVGrid(columns: colunas, spacing: 30) {
                    ForEach(m.cenas, id: \.self) { c in
                        Button { Task { await m.cena(c) } } label: {
                            Text(c).font(.system(size: 30, weight: .medium)).lineLimit(2).multilineTextAlignment(.center)
                                .frame(maxWidth: .infinity).frame(height: 120)
                        }.buttonStyle(EstiloFelyx())
                    }
                }
                if !m.noticias.isEmpty {
                    Text("NOTÍCIAS").font(.system(size: 22, design: .monospaced)).tracking(4).foregroundStyle(cinza)
                    ScrollView(.horizontal) {
                        HStack(spacing: 30) {
                            ForEach(m.noticias, id: \.1) { (tag, n) in
                                Button { Task { await m.explicar(n) } } label: {
                                    VStack(alignment: .leading, spacing: 10) {
                                        Text(tag + (n.source.map { " · " + $0.uppercased() } ?? "")).font(.system(size: 18, design: .monospaced)).opacity(0.7)
                                        Text(n.title).font(.system(size: 26)).lineLimit(3).multilineTextAlignment(.leading)
                                    }.padding(24).frame(width: 520, height: 170, alignment: .topLeading)
                                }.buttonStyle(EstiloFelyx())
                            }
                        }.padding(.vertical, 24).padding(.horizontal, 6)
                    }.scrollClipDisabled()
                }
                HStack(spacing: 30) {
                    Button { m.responderIA(!m.iaAceita) } label: { Text(m.iaAceita ? "Desligar IA" : "Permitir IA").font(.system(size: 24)).padding(.horizontal, 34).frame(height: 70) }
                        .buttonStyle(EstiloFelyx(raio: 16))
                    Button { m.sair() } label: { Text("Sair").font(.system(size: 24)).padding(.horizontal, 34).frame(height: 70) }
                        .buttonStyle(EstiloFelyx(raio: 16))
                }
            }
            .padding(.leading, 80).padding(.trailing, 20).padding(.vertical, 50)
        }
        .scrollClipDisabled()
    }
}

/// Salas: as cenas agrupadas pelo cômodo, como no app.
struct Salas: View {
    @EnvironmentObject var m: ModeloTV
    @Binding var sala: String
    private let colunas = Array(repeating: GridItem(.flexible(), spacing: 30), count: 4)
    var body: some View {
        let grupos = Dictionary(grouping: m.cenas, by: { m.comodos.sala($0) })
        let ordem = m.comodos.ordem(Set(grupos.keys))
        let atual = ordem.contains(sala) ? sala : (ordem.first ?? "")
        VStack(alignment: .leading, spacing: 30) {
            ScrollView(.horizontal) {
                HStack(spacing: 22) {
                    ForEach(ordem, id: \.self) { s in
                        Button { sala = s } label: { Text(s).font(.system(size: 28, weight: .medium)).padding(.horizontal, 34).frame(height: 76) }
                            .buttonStyle(EstiloFelyx(raio: 38, selecionado: s == atual))
                    }
                }.padding(.vertical, 24).padding(.horizontal, 6)
            }.scrollClipDisabled().focusSection()
            ScrollView {
                LazyVGrid(columns: colunas, spacing: 30) {
                    ForEach(grupos[atual] ?? [], id: \.self) { c in
                        Button { Task { await m.cena(c) } } label: {
                            Text(c).font(.system(size: 30, weight: .medium)).lineLimit(2).multilineTextAlignment(.center)
                                .frame(maxWidth: .infinity).frame(height: 120)
                        }.buttonStyle(EstiloFelyx())
                    }
                }.padding(.vertical, 20).padding(.horizontal, 6)
            }.scrollClipDisabled().focusSection()
            Spacer(minLength: 0)
        }
        .padding(.leading, 80).padding(.trailing, 20).padding(.top, 40)
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

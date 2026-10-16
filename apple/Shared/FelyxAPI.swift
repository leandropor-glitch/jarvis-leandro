import Foundation
import Security

/// Endereços do n8n e chamadas usadas pelo app nativo (Siri, atalhos e Apple TV).
/// A interface principal (iPhone, iPad, Mac e Vision Pro) é a página web; estas chamadas são as mesmas que ela faz.
enum FelyxAPI {
    static let base = URL(string: "https://vinciautomacao.app.n8n.cloud/webhook")!
    static let paginaApp = URL(string: "https://leandropor-glitch.github.io/jarvis-leandro/app/")!
    static let whatsapp = URL(string: "https://wa.me/5521967789150")!
    /// O n8n só aceita chamadas com esta origem (a mesma da página do app).
    static let origem = "https://leandropor-glitch.github.io"

    struct Resposta: Decodable {
        var ok: Bool?
        var erro: String?
        var mensagem: String?
        var token: String?
        var ticket: String?
        var nome: String?
        var temSenha: Bool?
        var atalho: Bool?
        var text: String?
        var cenas: [String]?
        var aparelhos: [Aparelho]?
    }
    struct Aparelho: Decodable, Hashable { var nome: String; var tipo: String? }

    static func post<T: Decodable>(_ caminho: String, _ corpo: [String: Any], como: T.Type) async throws -> T {
        var req = URLRequest(url: base.appendingPathComponent(caminho))
        req.httpMethod = "POST"
        req.timeoutInterval = 90
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(origem, forHTTPHeaderField: "Origin")
        req.httpBody = try JSONSerialization.data(withJSONObject: corpo)
        let (dados, _) = try await URLSession.shared.data(for: req)
        return try JSONDecoder().decode(T.self, from: dados)
    }

    static func get<T: Decodable>(_ caminho: String, como: T.Type) async throws -> T {
        var req = URLRequest(url: base.appendingPathComponent(caminho))
        req.timeoutInterval = 60
        req.cachePolicy = .reloadIgnoringLocalCacheData
        req.setValue(origem, forHTTPHeaderField: "Origin")
        let (dados, _) = try await URLSession.shared.data(for: req)
        return try JSONDecoder().decode(T.self, from: dados)
    }

    static func app(_ acao: String, _ dados: [String: Any] = [:]) async throws -> Resposta {
        var corpo = dados; corpo["acao"] = acao
        return try await post("felix/app", corpo, como: Resposta.self)
    }

    /// Comando da casa direto (sem IA). Se não for comando claro, pergunta ao cérebro.
    static func comandar(_ texto: String) async -> String {
        guard let token = Sessao.token else { return "Abra o Felyx e entre com seu número primeiro." }
        do {
            let r = try await app("comando", ["token": token, "texto": texto])
            if r.ok == true { return r.text ?? "Feito." }
            if r.erro == "sessao" { Sessao.limpar(); return "Sua sessão expirou. Abra o Felyx e entre de novo." }
            if r.atalho != true { return await perguntar(texto) }
            return r.text ?? "A central da Vinci não confirmou."
        } catch { return "Sem conexão com a casa agora." }
    }

    static func perguntar(_ pergunta: String) async -> String {
        struct R: Decodable { var text: String? }
        let nome = Sessao.nome ?? ""
        let primeiro = nome.split(separator: " ").first.map(String.init) ?? ""
        let fala = (!primeiro.isEmpty && primeiro.lowercased() != "leandro") ? "(\(primeiro) falando pelo app) \(pergunta)" : pergunta
        do {
            let r = try await post("felix/pergunta", ["pergunta": fala, "sessionId": "app-nativo", "origem": "app-nativo", "usuario": nome], como: R.self)
            let t = (r.text ?? "").replacingOccurrences(of: "alexa", with: "Vinci", options: [.caseInsensitive])
            return t.isEmpty ? "Não consegui consultar o cérebro agora." : t
        } catch { return "Sem conexão com o Felyx agora." }
    }
}

/// Sessão do app guardada no Keychain (o token chega da página quando a pessoa entra).
enum Sessao {
    private static let servico = "com.vinci.felyx.sessao"
    static var token: String? { ler("token") }
    static var nome: String? { ler("nome") }
    static func salvar(token: String, nome: String) { gravar("token", token); gravar("nome", nome) }
    static func limpar() { apagar("token"); apagar("nome") }

    private static func consulta(_ conta: String) -> [String: Any] {
        [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: servico, kSecAttrAccount as String: conta]
    }
    private static func ler(_ conta: String) -> String? {
        var q = consulta(conta); q[kSecReturnData as String] = true; q[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        guard SecItemCopyMatching(q as CFDictionary, &item) == errSecSuccess, let d = item as? Data else { return nil }
        return String(data: d, encoding: .utf8)
    }
    private static func gravar(_ conta: String, _ valor: String) {
        apagar(conta)
        var q = consulta(conta); q[kSecValueData as String] = Data(valor.utf8)
        q[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        SecItemAdd(q as CFDictionary, nil)
    }
    private static func apagar(_ conta: String) { SecItemDelete(consulta(conta) as CFDictionary) }
}

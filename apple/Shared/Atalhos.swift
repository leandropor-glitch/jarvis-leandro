import AppIntents
import Foundation

/// "E aí Siri, falar com o Felyx": abre o app já ouvindo.
struct FalarComFelyx: AppIntent {
    static var title: LocalizedStringResource = "Falar com o Felyx"
    static var description = IntentDescription("Abre o Felyx já pronto para ouvir.")
    static var openAppWhenRun: Bool = true
    @MainActor
    func perform() async throws -> some IntentResult {
        try? await Task.sleep(nanoseconds: 400_000_000)
        Ponte.enviar("falar")
        return .result()
    }
}

/// Ativa uma cena da casa sem abrir o app (vai direto para a central da Vinci).
struct AtivarCena: AppIntent {
    static var title: LocalizedStringResource = "Ativar cena da casa"
    static var description = IntentDescription("Ativa uma cena da Vinci, como Boa Noite ou Luz Alta.")
    @Parameter(title: "Cena", requestValueDialog: "Qual cena?") var cena: String
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let r = await FelyxAPI.comandar("ativa a cena \(cena)")
        return .result(dialog: IntentDialog(stringLiteral: r))
    }
}

/// Qualquer comando da casa em texto livre: "liga o abajur", "desliga o ventilador".
struct ComandoDaCasa: AppIntent {
    static var title: LocalizedStringResource = "Comando para a casa"
    static var description = IntentDescription("Manda um comando curto para a casa, como ligar ou desligar um aparelho.")
    @Parameter(title: "Comando", requestValueDialog: "O que eu faço na casa?") var texto: String
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let r = await FelyxAPI.comandar(texto)
        return .result(dialog: IntentDialog(stringLiteral: r))
    }
}

/// Pergunta qualquer coisa ao cérebro do Felyx e lê a resposta.
struct PerguntarAoFelyx: AppIntent {
    static var title: LocalizedStringResource = "Perguntar ao Felyx"
    @Parameter(title: "Pergunta", requestValueDialog: "O que você quer saber?") var pergunta: String
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let r = await FelyxAPI.perguntar(pergunta)
        return .result(dialog: IntentDialog(stringLiteral: r))
    }
}

struct FelyxAtalhos: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(intent: FalarComFelyx(), phrases: ["Falar com o \(.applicationName)", "Chamar o \(.applicationName)", "Abrir o \(.applicationName)"], shortTitle: "Falar com o Felyx", systemImageName: "mic.fill")
        AppShortcut(intent: AtivarCena(), phrases: ["Ativar cena no \(.applicationName)", "Cena da casa no \(.applicationName)"], shortTitle: "Ativar cena", systemImageName: "house.fill")
        AppShortcut(intent: ComandoDaCasa(), phrases: ["Comando da casa no \(.applicationName)"], shortTitle: "Comando da casa", systemImageName: "lightswitch.on")
        AppShortcut(intent: PerguntarAoFelyx(), phrases: ["Perguntar ao \(.applicationName)"], shortTitle: "Perguntar", systemImageName: "text.bubble")
    }
}

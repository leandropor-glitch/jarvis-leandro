import SwiftUI

@main
struct FelyxApp: App {
    var body: some Scene {
        WindowGroup {
            FelyxTela()
                .preferredColorScheme(.dark)
                #if os(macOS)
                .frame(minWidth: 960, minHeight: 640)
                #endif
        }
        #if os(macOS)
        .windowStyle(.hiddenTitleBar)
        .defaultSize(width: 1440, height: 900)
        .commands {
            CommandGroup(after: .newItem) {
                Button("Falar com o Felyx") { Ponte.enviar("falar") }.keyboardShortcut("f", modifiers: [.command, .shift])
                Button("Abrir o Felyx no WhatsApp") { NSWorkspace.shared.open(FelyxAPI.whatsapp) }
            }
        }
        #endif
        #if os(visionOS)
        .windowStyle(.plain)
        .defaultSize(width: 1280, height: 800)
        #endif
    }
}

struct FelyxTela: View {
    var body: some View {
        FelyxWebView(url: FelyxTela.endereco())
            #if os(visionOS)
            .glassBackgroundEffect()
            #else
            .background(Color(red: 0.024, green: 0.027, blue: 0.039))
            .ignoresSafeArea()
            #endif
    }

    /// A página sabe em que aparelho está pelo parâmetro p (muda o layout para o desenho aprovado de cada um).
    static func endereco() -> URL {
        var p = "ios"
        #if os(macOS)
        p = "mac"
        #elseif os(visionOS)
        p = "vision"
        #else
        if UIDevice.current.userInterfaceIdiom == .pad { p = "ipad" }
        #endif
        var c = URLComponents(url: FelyxAPI.paginaApp, resolvingAgainstBaseURL: false)!
        c.queryItems = [URLQueryItem(name: "p", value: p)]
        return c.url!
    }
}

/// Recados do lado nativo (Siri, atalhos, menus) para a página: chama window.felyxNativo(acao, dado).
enum Ponte {
    static let aviso = Notification.Name("felyx.nativo")
    static func enviar(_ acao: String, _ dado: String? = nil) {
        NotificationCenter.default.post(name: aviso, object: nil, userInfo: ["acao": acao, "dado": dado ?? ""])
    }
}

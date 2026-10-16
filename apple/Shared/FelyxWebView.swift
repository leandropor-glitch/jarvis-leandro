import SwiftUI
import WebKit

#if os(macOS)
typealias Representavel = NSViewRepresentable
#else
typealias Representavel = UIViewRepresentable
#endif

/// A página do app dentro de uma WKWebView, com microfone liberado, links externos abrindo fora
/// (WhatsApp, Safari) e a ponte "felyx" para a página falar com o lado nativo.
struct FelyxWebView: Representavel {
    let url: URL

    func makeCoordinator() -> Coordenador { Coordenador() }

    func criar(_ c: Coordenador) -> WKWebView {
        let cfg = WKWebViewConfiguration()
        cfg.websiteDataStore = .default()
        cfg.mediaTypesRequiringUserActionForPlayback = []
        #if !os(macOS)
        cfg.allowsInlineMediaPlayback = true
        #endif
        cfg.userContentController.add(c, name: "felyx")
        let web = WKWebView(frame: .zero, configuration: cfg)
        web.navigationDelegate = c
        web.uiDelegate = c
        web.allowsBackForwardNavigationGestures = false
        #if DEBUG
        if #available(iOS 16.4, macOS 13.3, *) { web.isInspectable = true }
        #endif
        #if os(macOS)
        web.setValue(false, forKey: "drawsBackground")
        #else
        web.isOpaque = false
        web.backgroundColor = .clear
        web.scrollView.backgroundColor = .clear
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.scrollView.bounces = false
        #endif
        c.web = web
        web.load(URLRequest(url: url))
        return web
    }

    #if os(macOS)
    func makeNSView(context: Context) -> WKWebView { criar(context.coordinator) }
    func updateNSView(_ v: WKWebView, context: Context) {}
    #else
    func makeUIView(context: Context) -> WKWebView { criar(context.coordinator) }
    func updateUIView(_ v: WKWebView, context: Context) {}
    #endif

    final class Coordenador: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
        weak var web: WKWebView?
        private var pendentes: [(String, String)] = []
        private var carregou = false

        override init() {
            super.init()
            NotificationCenter.default.addObserver(forName: Ponte.aviso, object: nil, queue: .main) { [weak self] n in
                let acao = n.userInfo?["acao"] as? String ?? ""
                let dado = n.userInfo?["dado"] as? String ?? ""
                self?.chamarPagina(acao, dado)
            }
        }

        func chamarPagina(_ acao: String, _ dado: String) {
            guard carregou, let web else { pendentes.append((acao, dado)); return }
            let js = "window.felyxNativo && window.felyxNativo(\(json(acao)), \(json(dado)))"
            web.evaluateJavaScript(js, completionHandler: nil)
        }
        private func json(_ s: String) -> String {
            let d = try? JSONSerialization.data(withJSONObject: [s]); let t = d.flatMap { String(data: $0, encoding: .utf8) } ?? "[\"\"]"
            return String(t.dropFirst().dropLast())
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            carregou = true
            let fila = pendentes; pendentes = []
            fila.forEach { chamarPagina($0.0, $0.1) }
        }

        // microfone: a própria página pede; o sistema mostra o aviso uma vez
        func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin, initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType, decisionHandler: @escaping (WKPermissionDecision) -> Void) {
            decisionHandler(origin.host.hasSuffix("github.io") ? .grant : .prompt)
        }

        // tudo que não é a página do app abre fora (WhatsApp, notícias no navegador)
        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let u = action.request.url else { return decisionHandler(.allow) }
            let interno = u.host == FelyxAPI.paginaApp.host || u.host?.hasSuffix("googleapis.com") == true || u.scheme == "about" || u.scheme == "blob"
            if interno || action.targetFrame?.isMainFrame == false { return decisionHandler(.allow) }
            abrirFora(u); decisionHandler(.cancel)
        }
        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            if let u = action.request.url { abrirFora(u) }
            return nil
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard let m = message.body as? [String: Any], let tipo = m["tipo"] as? String else { return }
            switch tipo {
            case "abrir": if let s = m["url"] as? String, let u = URL(string: s) { abrirFora(u) }
            case "login": if let t = m["token"] as? String { Sessao.salvar(token: t, nome: m["nome"] as? String ?? "") }
            case "logout": Sessao.limpar()
            default: break
            }
        }

        private func abrirFora(_ u: URL) {
            #if os(macOS)
            NSWorkspace.shared.open(u)
            #else
            UIApplication.shared.open(u)
            #endif
        }
    }
}

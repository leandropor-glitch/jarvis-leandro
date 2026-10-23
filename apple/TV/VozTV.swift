import AVFoundation
import Foundation

/// Voz do Felyx na Apple TV: a mesma Algieba do app, do site e do WhatsApp (Gemini Live).
/// A TV não conversa pelo microfone: manda o texto da resposta ao Gemini e toca o áudio que volta.
/// Só fala depois da permissão de IA (Consentimento), igual às perguntas.
@MainActor
final class VozTV: ObservableObject {
    static let modelo = "gemini-3.8-live"
    static let voz = "Algieba"

    @Published private(set) var falando = false

    private var ws: URLSessionWebSocketTask?
    private let motor = AVAudioEngine()
    private let player = AVAudioPlayerNode()
    private let formato = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: 24000, channels: 1, interleaved: false)!
    private var pendentes = 0          // trechos de áudio agendados que ainda não acabaram de tocar
    private var fimDoTurno = false     // o Gemini avisou que terminou de mandar o áudio
    private var geracao = 0            // cada fala nova invalida a anterior

    init() {
        motor.attach(player)
        motor.connect(player, to: motor.mainMixerNode, format: formato)
    }

    /// Lê o texto em voz alta. Uma fala nova interrompe a que estiver tocando.
    func falar(_ texto: String) {
        parar()
        let t = texto.trimmingCharacters(in: .whitespacesAndNewlines)
        guard Consentimento.aceito, let sessao = Sessao.token, !t.isEmpty else { return }
        let g = geracao
        Task { await conectarEFalar(t, sessao: sessao, geracao: g) }
    }

    func parar() {
        geracao += 1
        ws?.cancel(with: .normalClosure, reason: nil); ws = nil
        player.stop()
        pendentes = 0; fimDoTurno = false; falando = false
    }

    // MARK: - conexão

    private func conectarEFalar(_ texto: String, sessao: String, geracao g: Int) async {
        // token efêmero do Gemini, emitido pela ponte do n8n só para sessões válidas do app
        struct Token: Decodable { var token: String? }
        var c = URLComponents(url: FelyxAPI.base.appendingPathComponent("felix/token"), resolvingAgainstBaseURL: false)!
        c.queryItems = [URLQueryItem(name: "s", value: sessao)]
        var req = URLRequest(url: c.url!)
        req.timeoutInterval = 30
        req.cachePolicy = .reloadIgnoringLocalCacheData
        req.setValue(FelyxAPI.origem, forHTTPHeaderField: "Origin")
        guard let (dados, resp) = try? await URLSession.shared.data(for: req),
              (resp as? HTTPURLResponse)?.statusCode == 200,
              let tk = (try? JSONDecoder().decode(Token.self, from: dados))?.token, !tk.isEmpty,
              g == geracao else { return }

        var w = URLComponents(string: "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained")!
        w.queryItems = [URLQueryItem(name: "access_token", value: tk)]
        let tarefa = URLSession.shared.webSocketTask(with: w.url!)
        ws = tarefa
        tarefa.resume()

        let setup: [String: Any] = ["setup": [
            "model": "models/\(Self.modelo)",
            "generationConfig": [
                "responseModalities": ["AUDIO"],
                "speechConfig": ["voiceConfig": ["prebuiltVoiceConfig": ["voiceName": Self.voz]]]
            ],
            "systemInstruction": ["parts": [["text": Self.instrucao]]]
        ]]
        guard await enviar(setup, em: tarefa) else { return }

        // espera o "setupComplete" antes de mandar o texto
        while g == geracao {
            guard let m = await receber(tarefa) else { return }
            if m["setupComplete"] != nil { break }
        }
        let pedido: [String: Any] = ["clientContent": [
            "turns": [["role": "user", "parts": [["text": "Leia em voz alta, exatamente como está escrito:\n\n" + texto]]]],
            "turnComplete": true
        ]]
        guard g == geracao, await enviar(pedido, em: tarefa) else { return }

        prepararAudio()
        falando = true
        while g == geracao {
            guard let m = await receber(tarefa) else { break }
            guard let sc = m["serverContent"] as? [String: Any] else { continue }
            if let turno = sc["modelTurn"] as? [String: Any], let partes = turno["parts"] as? [[String: Any]] {
                for p in partes {
                    if let inline = p["inlineData"] as? [String: Any], let b64 = inline["data"] as? String, let pcm = Data(base64Encoded: b64) {
                        tocar(pcm, geracao: g)
                    }
                }
            }
            if sc["turnComplete"] as? Bool == true { fimDoTurno = true; terminarSePuder(g); break }
        }
        tarefa.cancel(with: .normalClosure, reason: nil)
        if ws === tarefa { ws = nil }
        if g == geracao && pendentes == 0 { falando = false }
    }

    private func enviar(_ obj: [String: Any], em t: URLSessionWebSocketTask) async -> Bool {
        guard let d = try? JSONSerialization.data(withJSONObject: obj), let s = String(data: d, encoding: .utf8) else { return false }
        do { try await t.send(.string(s)); return true } catch { return false }
    }

    private func receber(_ t: URLSessionWebSocketTask) async -> [String: Any]? {
        guard let msg = try? await t.receive() else { return nil }
        let d: Data
        switch msg {
        case .data(let x): d = x
        case .string(let s): d = Data(s.utf8)
        @unknown default: return [:]
        }
        return (try? JSONSerialization.jsonObject(with: d)) as? [String: Any] ?? [:]
    }

    // MARK: - áudio (PCM 16 bits, 24 kHz, mono, little-endian)

    private func prepararAudio() {
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio)
        try? AVAudioSession.sharedInstance().setActive(true)
        if !motor.isRunning { try? motor.start() }
        if !player.isPlaying { player.play() }
    }

    private func tocar(_ pcm: Data, geracao g: Int) {
        let n = pcm.count / 2
        guard n > 0, let buf = AVAudioPCMBuffer(pcmFormat: formato, frameCapacity: AVAudioFrameCount(n)) else { return }
        buf.frameLength = AVAudioFrameCount(n)
        let saida = buf.floatChannelData![0]
        pcm.withUnsafeBytes { (bruto: UnsafeRawBufferPointer) in
            for i in 0..<n {
                let v = Int16(littleEndian: bruto.loadUnaligned(fromByteOffset: i * 2, as: Int16.self))
                saida[i] = Float(v) / 32768
            }
        }
        pendentes += 1
        player.scheduleBuffer(buf) { [weak self] in
            Task { @MainActor in
                guard let self, g == self.geracao else { return }
                self.pendentes -= 1
                self.terminarSePuder(g)
            }
        }
    }

    private func terminarSePuder(_ g: Int) {
        if g == geracao && fimDoTurno && pendentes <= 0 { falando = false }
    }

    private static let instrucao = """
    Você é a voz do Félix (na tela escreve-se Felyx; fala-se "Félix"), a inteligência da casa. Fale SEMPRE em português do Brasil.
    Personalidade: um homem jovem, forte e confiante, voz grave e encorpada, direto, elegante e com bom humor na medida.
    Sua única tarefa aqui é ler em voz alta, de forma fiel e natural, o texto que receber. Não resuma, não comente, não acrescente nada e não faça perguntas.
    Nunca diga as palavras "Jarvis" nem "Alexa"; se o texto contiver "Alexa", leia "Vinci".
    """
}

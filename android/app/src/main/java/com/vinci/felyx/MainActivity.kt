package com.vinci.felyx

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.webkit.WebResourceError
import android.webkit.WebResourceResponse
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import org.json.JSONObject

/**
 * Felyx AI Vinci para Android: a mesma página do app (desenho Android aprovado),
 * com microfone liberado, links externos abrindo fora (WhatsApp, navegador) e atalhos do ícone.
 */
class MainActivity : ComponentActivity() {
    private lateinit var web: WebView
    private var pedidoPendente: PermissionRequest? = null
    private var carregou = false
    private var pronto = false
    private lateinit var aviso: LinearLayout
    private lateinit var girando: ProgressBar
    private lateinit var textoAviso: TextView
    private lateinit var tentar: Button
    private val relogio = Handler(Looper.getMainLooper())
    private val prazo = Runnable { if (!pronto) falhou() }
    private val fila = mutableListOf<Pair<String, String>>()

    private val pedirMicrofone = registerForActivityResult(ActivityResultContracts.RequestPermission()) { ok ->
        val p = pedidoPendente ?: return@registerForActivityResult
        if (ok) p.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) else p.deny()
        pedidoPendente = null
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        web = WebView(this)
        web.setBackgroundColor(Color.parseColor("#06070A"))
        setContentView(FrameLayout(this).apply {
            setBackgroundColor(Color.parseColor("#06070A"))
            addView(web, FrameLayout.LayoutParams(-1, -1))
            addView(montarAviso(), FrameLayout.LayoutParams(-1, -1))
        })

        // respeita a barra de status e a de navegação (a tela vai de ponta a ponta)
        ViewCompat.setOnApplyWindowInsetsListener(web) { v, insets ->
            val b = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            val ime = insets.getInsets(WindowInsetsCompat.Type.ime())
            v.setPadding(b.left, b.top, b.right, maxOf(b.bottom, ime.bottom))
            WindowInsetsCompat.CONSUMED
        }

        with(web.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            databaseEnabled = true
        }
        web.addJavascriptInterface(Ponte(), "FelyxAndroid")

        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, req: WebResourceRequest): Boolean {
                val u = req.url
                if (u.host == PAGINA.host) return false
                abrirFora(u.toString()); return true
            }
            override fun onReceivedError(view: WebView, req: WebResourceRequest, erro: WebResourceError) {
                if (req.isForMainFrame) falhou()
            }
            override fun onReceivedHttpError(view: WebView, req: WebResourceRequest, resp: WebResourceResponse) {
                if (req.isForMainFrame && resp.statusCode >= 400) falhou()
            }
            override fun onPageFinished(view: WebView, url: String) {
                carregou = true
                val pend = fila.toList(); fila.clear()
                pend.forEach { chamarPagina(it.first, it.second) }
            }
        }
        web.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread {
                    if (!request.resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) { request.deny(); return@runOnUiThread }
                    if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                        request.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE))
                    } else {
                        pedidoPendente = request
                        pedirMicrofone.launch(Manifest.permission.RECORD_AUDIO)
                    }
                }
            }
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() { if (web.canGoBack()) web.goBack() else finish() }
        })

        if (savedInstanceState == null) web.loadUrl(PAGINA.toString()) else web.restoreState(savedInstanceState)
        esperarPagina()
        tratar(intent)
    }

    override fun onSaveInstanceState(outState: Bundle) { super.onSaveInstanceState(outState); web.saveState(outState) }
    override fun onNewIntent(intent: Intent) { super.onNewIntent(intent); tratar(intent) }

    /** Atalhos do ícone (segurar o ícone do Felyx na tela inicial). */
    private fun tratar(i: Intent?) {
        when (i?.action) {
            "com.vinci.felyx.FALAR" -> chamarPagina("falar", "")
            "com.vinci.felyx.CASA" -> chamarPagina("aba", "vCasa")
        }
    }

    private fun chamarPagina(acao: String, dado: String) {
        if (!carregou) { fila.add(acao to dado); return }
        val js = "window.felyxNativo && window.felyxNativo(${JSONObject.quote(acao)}, ${JSONObject.quote(dado)})"
        web.post { web.evaluateJavascript(js, null) }
    }

    /** Tela nativa por cima da página: "carregando" e, se a página não ficar pronta, o erro com "Tentar de novo". */
    private fun montarAviso(): View {
        val d = resources.displayMetrics.density
        girando = ProgressBar(this)
        textoAviso = TextView(this).apply {
            setTextColor(Color.parseColor("#E9EAE6")); textSize = 17f; gravity = Gravity.CENTER
            setPadding(0, (20 * d).toInt(), 0, (20 * d).toInt())
        }
        tentar = Button(this).apply { text = "Tentar de novo"; setOnClickListener { recarregar() } }
        aviso = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#06070A")); setPadding((32 * d).toInt(), 0, (32 * d).toInt(), 0)
            isClickable = true
            addView(girando); addView(textoAviso); addView(tentar)
        }
        return aviso
    }

    private fun esperarPagina() {
        pronto = false
        aviso.visibility = View.VISIBLE; girando.visibility = View.VISIBLE
        textoAviso.text = "Abrindo o Felyx…"; tentar.visibility = View.GONE
        relogio.removeCallbacks(prazo); relogio.postDelayed(prazo, 25_000)
    }

    private fun falhou() {
        if (pronto) return
        relogio.removeCallbacks(prazo)
        aviso.visibility = View.VISIBLE; girando.visibility = View.GONE
        textoAviso.text = "Não consegui abrir o Felyx. Confira a conexão com a internet e tente de novo."
        tentar.visibility = View.VISIBLE
    }

    private fun ficouPronto() {
        pronto = true; relogio.removeCallbacks(prazo); aviso.visibility = View.GONE
    }

    private fun recarregar() { carregou = false; esperarPagina(); web.loadUrl(PAGINA.toString()) }

    override fun onDestroy() { relogio.removeCallbacks(prazo); super.onDestroy() }

    private fun abrirFora(url: String) {
        try { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) } catch (_: Exception) {}
    }

    inner class Ponte {
        @JavascriptInterface fun abrir(url: String) { runOnUiThread { abrirFora(url) } }
        // login/logout: a sessão fica na própria página; "pronto" = a página carregou e o script rodou
        @JavascriptInterface fun evento(json: String) {
            val tipo = try { JSONObject(json).optString("tipo") } catch (_: Exception) { "" }
            if (tipo == "pronto") runOnUiThread { ficouPronto() }
        }
    }

    companion object {
        val PAGINA: Uri = Uri.parse("https://leandropor-glitch.github.io/jarvis-leandro/app/?p=android")
    }
}

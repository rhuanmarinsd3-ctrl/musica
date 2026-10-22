package br.com.vozesinais.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.content.Intent;
import android.content.res.AssetManager;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import android.speech.RecognitionSupport;
import android.speech.RecognitionSupportCallback;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import org.json.JSONException;
import org.json.JSONObject;
import org.vosk.Model;
import org.vosk.Recognizer;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/** Android shell: all content and recognition are local; microphone audio is never saved. */
public final class MainActivity extends Activity {
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private static final String START_URL = ORIGIN + "/assets/web/index.html";
    private static final String MODEL_ASSET = "model-pt-br";
    private static final int MICROPHONE_PERMISSION = 104;
    private static final int SAMPLE_RATE = 16000;
    private static final int MAX_TEXT_LENGTH = 8000;

    private final Handler main = new Handler(Looper.getMainLooper());
    private final ExecutorService audioWorker = Executors.newSingleThreadExecutor();
    private final AtomicBoolean captureRequested = new AtomicBoolean(false);
    private final AtomicBoolean captureBusy = new AtomicBoolean(false);
    private WebView web;
    private TextToSpeech tts;
    private Voice offlineVoice;
    private volatile Model model;
    private volatile AudioRecord recorder;
    private volatile boolean destroyed;
    private volatile boolean ttsReady;
    private volatile boolean recognizerReady;
    private volatile String ttsMessage = "Preparando a voz do aparelho…";
    private volatile String recognizerMessage = "Preparando a transcrição offline…";
    private boolean pageReady;
    private boolean resumed;
    private boolean startAfterPermission;
    private boolean ttsInitialized;
    private boolean ttsInitializationComplete;
    private volatile boolean bundledModelUnavailable;
    private String finalUtteranceId;
    private String currentSpeechPrefix;
    private long speechSequence;
    private SpeechRecognizer onDeviceRecognizer;
    private boolean onDeviceReady;
    private boolean deviceRequested;
    private boolean deviceBusy;
    private long deviceGeneration;
    private int deviceBusyRetries;
    private final StringBuilder deviceCompleted = new StringBuilder();
    private String devicePartial = "";

    @Override
    public void onCreate(Bundle state) {
        super.onCreate(state);
        configureWebView();
        initializeSpeech();
        initializeModel();
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView() {
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(248, 248, 241));
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(248, 248, 241));
        root.addView(web, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(root);
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            root.setOnApplyWindowInsetsListener((view, windowInsets) -> {
                android.graphics.Insets insets = windowInsets.getInsets(
                        WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout()
                                | WindowInsets.Type.ime());
                view.setPadding(insets.left, insets.top, insets.right, insets.bottom);
                return WindowInsets.CONSUMED;
            });
            root.requestApplyInsets();
        } else {
            root.setFitsSystemWindows(true);
        }
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);

        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setBlockNetworkLoads(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setGeolocationEnabled(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);

        web.addJavascriptInterface(new NativeBridge(), "NativeBridge");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !isWebAsset(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return !isWebAsset(Uri.parse(url));
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (!"GET".equals(request.getMethod()) || !isWebAsset(uri)) {
                    return blockedResponse();
                }
                String path = uri.getPath().substring("/assets/".length());
                if (path.contains("..") || path.indexOf('\\') >= 0) {
                    return blockedResponse();
                }
                try {
                    return new WebResourceResponse(mimeType(path), "UTF-8",
                            200, "OK", Collections.singletonMap("Cache-Control", "no-store"),
                            getAssets().open(path, AssetManager.ACCESS_STREAMING));
                } catch (IOException ignored) {
                    return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found",
                            Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
                }
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                Uri finished = url == null ? null : Uri.parse(url);
                pageReady = finished != null && isWebAsset(finished)
                        && "/assets/web/index.html".equals(finished.getPath())
                        && finished.getQuery() == null;
                if (pageReady) publishCapabilities();
            }
        });
        WebView.setWebContentsDebuggingEnabled((getApplicationInfo().flags
                & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0);
        web.loadUrl(START_URL);
    }

    private static boolean isWebAsset(Uri uri) {
        return "https".equals(uri.getScheme())
                && "appassets.androidplatform.net".equals(uri.getHost())
                && uri.getPort() == -1 && uri.getUserInfo() == null
                && uri.getPath() != null && uri.getPath().startsWith("/assets/web/");
    }

    private static WebResourceResponse blockedResponse() {
        return new WebResourceResponse("text/plain", "UTF-8", 403, "Forbidden",
                Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
    }

    private static String mimeType(String path) {
        String lower = path.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".html")) return "text/html";
        if (lower.endsWith(".css")) return "text/css";
        if (lower.endsWith(".js")) return "text/javascript";
        if (lower.endsWith(".json")) return "application/json";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".mp4")) return "video/mp4";
        if (lower.endsWith(".woff2")) return "font/woff2";
        return "application/octet-stream";
    }

    private void initializeSpeech() {
        tts = new TextToSpeech(getApplicationContext(), status -> main.post(() -> {
            if (destroyed) return;
            ttsInitializationComplete = true;
            if (status != TextToSpeech.SUCCESS || tts == null) {
                ttsMessage = "Nenhuma voz offline disponível. Instale uma voz de português do Brasil nas configurações de texto para fala do aparelho.";
                publishCapabilities();
                return;
            }
            ttsInitialized = true;
            tts.setSpeechRate(0.9f);
            tts.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ASSISTANCE_ACCESSIBILITY)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build());
            tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override public void onStart(String id) {
                        main.post(() -> {
                            if (isCurrentUtterance(id)) emit("speaking", object("active", true));
                        });
                    }
                    @Override public void onDone(String id) {
                        main.post(() -> {
                            if (id.equals(finalUtteranceId)) {
                                finalUtteranceId = null;
                                currentSpeechPrefix = null;
                                emit("speaking", object("active", false));
                            }
                        });
                    }
                    @Override public void onError(String id) { onSpeechError(id); }
                    @Override public void onError(String id, int code) { onSpeechError(id); }
            });
            refreshOfflineVoice();
            publishCapabilities();
        }));
    }

    private void refreshOfflineVoice() {
        if (!ttsInitialized || tts == null || destroyed) return;
        offlineVoice = null;
        ttsReady = false;
        try {
            Set<Voice> voices = tts.getVoices();
            if (voices != null) {
                for (Voice voice : voices) {
                    Locale locale = voice.getLocale();
                    Set<String> features = voice.getFeatures();
                    if ("pt".equals(locale.getLanguage()) && "BR".equalsIgnoreCase(locale.getCountry())
                            && !voice.isNetworkConnectionRequired()
                            && (features == null || !features.contains("notInstalled"))
                            && (offlineVoice == null || voice.getQuality() > offlineVoice.getQuality())) {
                        offlineVoice = voice;
                    }
                }
            }
            ttsReady = offlineVoice != null && tts.setVoice(offlineVoice) == TextToSpeech.SUCCESS;
        } catch (RuntimeException ignored) {
            ttsReady = false;
        }
        ttsMessage = ttsReady ? "Voz offline em português pronta."
                : "Para ouvir, instale uma voz offline de português do Brasil nas configurações de texto para fala do aparelho. A transcrição e os cartões continuam disponíveis.";
    }

    private void onSpeechError(String id) {
        main.post(() -> {
            if (isCurrentUtterance(id)) {
                finalUtteranceId = null;
                currentSpeechPrefix = null;
                emit("speaking", object("active", false));
                error("Não foi possível falar. Confira a voz offline e o volume de mídia do aparelho.");
            }
        });
    }

    private boolean isCurrentUtterance(String id) {
        return id != null && currentSpeechPrefix != null && id.startsWith(currentSpeechPrefix);
    }

    private void initializeModel() {
        audioWorker.execute(() -> {
            try {
                File modelDirectory = unpackModel();
                Model loaded = new Model(modelDirectory.getAbsolutePath());
                if (destroyed) {
                    loaded.close();
                    return;
                }
                model = loaded;
                recognizerReady = true;
                recognizerMessage = "Transcrição offline pronta. Toque no microfone para começar.";
            } catch (IOException | RuntimeException | LinkageError exception) {
                bundledModelUnavailable = true;
                recognizerReady = false;
                recognizerMessage = "Verificando o reconhecimento offline do aparelho…";
                main.post(this::initializeOnDeviceRecognizer);
            }
            publishCapabilities();
        });
    }

    /** This fallback is explicitly on-device, never the default/cloud recognizer. */
    private void initializeOnDeviceRecognizer() {
        if (destroyed) return;
        if (onDeviceRecognizer != null) {
            onDeviceRecognizer.destroy();
            onDeviceRecognizer = null;
        }
        onDeviceReady = false;
        recognizerReady = false;
        recognizerMessage = "Verificando o reconhecimento offline do aparelho…";
        publishCapabilities();
        if (Build.VERSION.SDK_INT < 31 || !SpeechRecognizer.isOnDeviceRecognitionAvailable(this)) {
            recognizerReady = false;
            recognizerMessage = "Esta instalação não inclui o modelo de voz e o aparelho não oferece reconhecimento offline compatível. Use a versão completa com o modelo de português.";
            publishCapabilities();
            return;
        }
        try {
            onDeviceRecognizer = SpeechRecognizer.createOnDeviceSpeechRecognizer(this);
            final SpeechRecognizer queriedRecognizer = onDeviceRecognizer;
            if (Build.VERSION.SDK_INT >= 33) {
                onDeviceRecognizer.checkRecognitionSupport(recognitionIntent(), getMainExecutor(),
                        new RecognitionSupportCallback() {
                            @Override
                            public void onSupportResult(RecognitionSupport support) {
                                if (destroyed || onDeviceRecognizer != queriedRecognizer) return;
                                boolean portugueseInstalled = false;
                                for (String language : support.getInstalledOnDeviceLanguages()) {
                                    if ("pt-BR".equalsIgnoreCase(language.replace('_', '-'))) {
                                        portugueseInstalled = true;
                                        break;
                                    }
                                }
                                onDeviceReady = portugueseInstalled;
                                recognizerReady = portugueseInstalled;
                                recognizerMessage = portugueseInstalled
                                        ? "Reconhecimento offline do aparelho pronto em português."
                                        : "O reconhecimento offline do aparelho precisa do idioma português do Brasil instalado. Use uma versão com o modelo incluído ou configure o idioma offline no aparelho.";
                                publishCapabilities();
                            }

                            @Override
                            public void onError(int error) {
                                if (!destroyed && onDeviceRecognizer == queriedRecognizer) {
                                    enableUnverifiedDeviceRecognizer();
                                }
                            }
                        });
            } else {
                enableUnverifiedDeviceRecognizer();
            }
        } catch (RuntimeException exception) {
            onDeviceReady = false;
            recognizerReady = false;
            recognizerMessage = "O serviço offline do aparelho não pôde ser iniciado. Use uma versão que inclua o modelo de português.";
            publishCapabilities();
        }
    }

    private void enableUnverifiedDeviceRecognizer() {
        onDeviceReady = onDeviceRecognizer != null;
        recognizerReady = onDeviceReady;
        recognizerMessage = "O aparelho oferece reconhecimento offline. O idioma português do Brasil precisa estar instalado; a disponibilidade será confirmada ao ouvir.";
        publishCapabilities();
    }

    private static Intent recognitionIntent() {
        return new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
                .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                .putExtra(RecognizerIntent.EXTRA_LANGUAGE, "pt-BR")
                .putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                .putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
    }

    /** Extract only model assets; no speech or conversation is written to disk. */
    private File unpackModel() throws IOException {
        String uuid;
        try (InputStream input = getAssets().open(MODEL_ASSET + "/uuid")) {
            uuid = new String(readSmallFile(input), StandardCharsets.UTF_8).trim();
        }
        if (uuid.isEmpty()) throw new IOException("Missing model identifier");
        String modelKey;
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(uuid.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte item : digest) hex.append(String.format(Locale.ROOT, "%02x", item & 255));
            modelKey = hex.toString();
        } catch (NoSuchAlgorithmException impossible) {
            throw new IOException("SHA-256 unavailable", impossible);
        }
        File base = new File(getNoBackupFilesDir(), "speech-models");
        if (!base.isDirectory() && !base.mkdirs()) throw new IOException("Cannot create model directory");
        File destination = new File(base, modelKey);
        File marker = new File(destination, "uuid");
        if (marker.isFile()) {
            try (InputStream input = new FileInputStream(marker)) {
                if (uuid.equals(new String(readSmallFile(input), StandardCharsets.UTF_8).trim())) {
                    return destination;
                }
            }
        }
        File staging = new File(base, "preparing-" + UUID.randomUUID());
        if (!staging.mkdirs()) throw new IOException("Cannot prepare model directory");
        try {
            copyModelAssets(MODEL_ASSET, staging);
            if (!staging.renameTo(destination) && !new File(destination, "uuid").isFile()) {
                throw new IOException("Cannot finalize model directory");
            }
            return destination;
        } finally {
            deleteDirectory(staging);
        }
    }

    private static byte[] readSmallFile(InputStream input) throws IOException {
        ByteArrayOutputStream result = new ByteArrayOutputStream();
        byte[] buffer = new byte[256];
        int size;
        while ((size = input.read(buffer)) != -1) {
            if (result.size() + size > 4096) throw new IOException("Invalid model identifier");
            result.write(buffer, 0, size);
        }
        return result.toByteArray();
    }

    private void copyModelAssets(String assetPath, File target) throws IOException {
        String[] children = getAssets().list(assetPath);
        if (children == null) throw new IOException("Cannot read model assets");
        for (String child : children) {
            if (child.contains("/") || child.contains("\\") || child.equals("..")) {
                throw new IOException("Invalid model asset path");
            }
            String path = assetPath + "/" + child;
            File output = new File(target, child);
            String[] nested = getAssets().list(path);
            if (nested != null && nested.length > 0) {
                if (!output.mkdirs()) throw new IOException("Cannot create model subdirectory");
                copyModelAssets(path, output);
            } else {
                try (InputStream input = getAssets().open(path);
                     FileOutputStream stream = new FileOutputStream(output)) {
                    byte[] buffer = new byte[32768];
                    int size;
                    while ((size = input.read(buffer)) != -1) stream.write(buffer, 0, size);
                }
            }
        }
    }

    private static void deleteDirectory(File file) {
        File[] children = file.listFiles();
        if (children != null) for (File child : children) deleteDirectory(child);
        if (file.exists()) file.delete();
    }

    public final class NativeBridge {
        @JavascriptInterface
        public String getCapabilities() { return capabilities().toString(); }

        @JavascriptInterface
        public void speak(String text) { main.post(() -> speakLocally(text)); }

        @JavascriptInterface
        public void stopSpeaking() { main.post(MainActivity.this::stopSpeech); }

        @JavascriptInterface
        public void startListening() { main.post(MainActivity.this::requestListening); }

        @JavascriptInterface
        public void stopListening() {
            main.post(() -> {
                startAfterPermission = false;
                stopCapture();
            });
        }
    }

    private void speakLocally(String value) {
        if (destroyed || !resumed) return;
        String text = value == null ? "" : value.trim();
        if (text.isEmpty()) { error("Escreva uma mensagem ou escolha um cartão para falar."); return; }
        if (text.length() > MAX_TEXT_LENGTH) {
            error("A mensagem pode ter até 8.000 caracteres. Divida o texto para continuar."); return;
        }
        if (!ttsReady || tts == null || offlineVoice == null) { error(ttsMessage); return; }
        if (offlineVoice.isNetworkConnectionRequired()
                || tts.setVoice(offlineVoice) != TextToSpeech.SUCCESS) {
            error("A voz offline não está disponível. Confira as configurações de texto para fala."); return;
        }
        stopCapture();
        stopSpeech();
        List<String> pieces = splitForSpeech(text, TextToSpeech.getMaxSpeechInputLength() - 1);
        String prefix = "speech-" + (++speechSequence) + "-";
        currentSpeechPrefix = prefix;
        finalUtteranceId = prefix + (pieces.size() - 1);
        for (int index = 0; index < pieces.size(); index++) {
            int result = tts.speak(pieces.get(index),
                    index == 0 ? TextToSpeech.QUEUE_FLUSH : TextToSpeech.QUEUE_ADD,
                    new Bundle(), prefix + index);
            if (result != TextToSpeech.SUCCESS) {
                stopSpeech();
                error("Não foi possível falar. Confira a voz offline nas configurações do aparelho.");
                return;
            }
        }
    }

    static List<String> splitForSpeech(String text, int maximum) {
        List<String> result = new ArrayList<>();
        int offset = 0;
        while (offset < text.length()) {
            int end = Math.min(text.length(), offset + maximum);
            if (end < text.length()) {
                if (Character.isHighSurrogate(text.charAt(end - 1))) end--;
                int space = text.lastIndexOf(' ', end - 1);
                if (space > offset + maximum / 2) end = space;
            }
            String part = text.substring(offset, end).trim();
            if (!part.isEmpty()) result.add(part);
            offset = end;
        }
        return result;
    }

    private void stopSpeech() {
        finalUtteranceId = null;
        currentSpeechPrefix = null;
        if (tts != null) tts.stop();
        emit("speaking", object("active", false));
    }

    private void requestListening() {
        if (destroyed || !resumed) return;
        if (!recognizerReady) { error(recognizerMessage); return; }
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            startAfterPermission = true;
            requestPermissions(new String[] {Manifest.permission.RECORD_AUDIO}, MICROPHONE_PERMISSION);
            return;
        }
        beginCapture();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode != MICROPHONE_PERMISSION) return;
        if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) {
            if (startAfterPermission && resumed) {
                startAfterPermission = false;
                beginCapture();
            }
        } else {
            startAfterPermission = false;
            error("O microfone está desativado. Você pode permitir o acesso nas configurações do aplicativo; os cartões e a escrita continuam disponíveis.");
        }
    }

    private void beginCapture() {
        if (destroyed || !resumed || !recognizerReady) return;
        if (model == null) {
            beginDeviceCapture();
            return;
        }
        if (!captureBusy.compareAndSet(false, true)) {
            if (captureRequested.get()) {
                emit("listening", object("active", true));
            } else {
                error("Aguarde o microfone terminar e tente novamente.");
            }
            return;
        }
        stopSpeech();
        captureRequested.set(true);
        emit("transcript", object("text", "", "final", false));
        emit("listening", object("active", true));
        audioWorker.execute(this::captureAudio);
    }

    private void beginDeviceCapture() {
        if (!onDeviceReady || onDeviceRecognizer == null) { error(recognizerMessage); return; }
        if (deviceRequested) {
            emit("listening", object("active", true));
            return;
        }
        stopSpeech();
        deviceRequested = true;
        deviceBusyRetries = 0;
        deviceCompleted.setLength(0);
        devicePartial = "";
        emit("transcript", object("text", "", "final", false));
        emit("listening", object("active", true));
        startDeviceSession();
    }

    private void startDeviceSession() {
        if (!deviceRequested || destroyed || !resumed || onDeviceRecognizer == null || deviceBusy) return;
        final long generation = ++deviceGeneration;
        deviceBusy = true;
        onDeviceRecognizer.setRecognitionListener(new android.speech.RecognitionListener() {
            private boolean current() { return !destroyed && generation == deviceGeneration; }
            @Override public void onReadyForSpeech(Bundle parameters) { }
            @Override public void onBeginningOfSpeech() { }
            @Override public void onRmsChanged(float rms) { }
            @Override public void onBufferReceived(byte[] buffer) { }
            @Override public void onEndOfSpeech() { }
            @Override public void onEvent(int type, Bundle parameters) { }
            @Override public void onPartialResults(Bundle results) {
                if (!current() || !deviceRequested) return;
                devicePartial = firstResult(results);
                String display = combine(deviceCompleted, devicePartial);
                emit("transcript", object("text", display, "final", false));
                if (display.length() >= MAX_TEXT_LENGTH) {
                    stopDeviceCapture();
                    error("A conversa chegou a 8.000 caracteres. Inicie uma nova transcrição para continuar.");
                }
            }
            @Override public void onResults(Bundle results) {
                if (!current()) return;
                deviceBusy = false;
                deviceBusyRetries = 0;
                appendRecognized(deviceCompleted, firstResult(results));
                devicePartial = "";
                emit("transcript", object("text", deviceCompleted.toString(), "final", true));
                if (deviceCompleted.length() >= MAX_TEXT_LENGTH) {
                    stopDeviceCapture();
                    error("A conversa chegou a 8.000 caracteres. Inicie uma nova transcrição para continuar.");
                } else if (deviceRequested) {
                    main.postDelayed(() -> {
                        if (current()) startDeviceSession();
                    }, 250);
                }
            }
            @Override public void onError(int code) {
                if (!current()) return;
                deviceBusy = false;
                if (!deviceRequested) return;
                if (code == SpeechRecognizer.ERROR_SPEECH_TIMEOUT || code == SpeechRecognizer.ERROR_NO_MATCH
                        || (code == SpeechRecognizer.ERROR_RECOGNIZER_BUSY && ++deviceBusyRetries <= 2)) {
                    devicePartial = "";
                    emit("transcript", object("text", deviceCompleted.toString(), "final", true));
                    main.postDelayed(() -> {
                        if (current()) startDeviceSession();
                    }, 400);
                    return;
                }
                stopDeviceCapture();
                if (code == SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED
                        || code == SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE) {
                    onDeviceReady = false;
                    recognizerReady = false;
                    recognizerMessage = "O idioma português do Brasil não está instalado para reconhecimento offline. Configure o idioma offline no aparelho ou use a versão com o modelo de português incluído.";
                    publishCapabilities();
                    error(recognizerMessage);
                } else if (code == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS) {
                    error("Permita o microfone nas configurações do aplicativo para transcrever a conversa.");
                } else {
                    error("O reconhecimento offline do aparelho não conseguiu continuar. Confira o microfone e o idioma português offline antes de tentar novamente.");
                }
            }
        });
        try {
            onDeviceRecognizer.startListening(recognitionIntent());
        } catch (RuntimeException exception) {
            stopDeviceCapture();
            error("O reconhecimento offline do aparelho não pôde começar. Confira a permissão do microfone e o idioma offline.");
        }
    }

    private static String firstResult(Bundle results) {
        if (results == null) return "";
        ArrayList<String> alternatives = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        return alternatives == null || alternatives.isEmpty() || alternatives.get(0) == null
                ? "" : alternatives.get(0).trim();
    }

    private void stopDeviceCapture() {
        if (!deviceRequested && !deviceBusy) return;
        deviceRequested = false;
        deviceBusy = false;
        deviceGeneration++;
        if (onDeviceRecognizer != null) {
            try { onDeviceRecognizer.cancel(); } catch (RuntimeException ignored) { }
        }
        emit("transcript", object("text", combine(deviceCompleted, devicePartial), "final", true));
        emit("listening", object("active", false));
    }

    @SuppressLint("MissingPermission")
    private void captureAudio() {
        AudioRecord localRecorder = null;
        Recognizer recognizer = null;
        StringBuilder completed = new StringBuilder();
        String lastPublished = "";
        try {
            if (!captureRequested.get() || destroyed) return;
            int minimum = AudioRecord.getMinBufferSize(SAMPLE_RATE,
                    AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT);
            if (minimum <= 0) throw new IOException("Unsupported microphone format");
            recognizer = new Recognizer(model, SAMPLE_RATE);
            localRecorder = new AudioRecord.Builder()
                    .setAudioSource(MediaRecorder.AudioSource.VOICE_RECOGNITION)
                    .setAudioFormat(new AudioFormat.Builder().setSampleRate(SAMPLE_RATE)
                            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                            .setChannelMask(AudioFormat.CHANNEL_IN_MONO).build())
                    .setBufferSizeInBytes(Math.max(minimum, SAMPLE_RATE)).build();
            if (localRecorder.getState() != AudioRecord.STATE_INITIALIZED) {
                throw new IOException("Microphone unavailable");
            }
            recorder = localRecorder;
            if (!captureRequested.get()) return;
            localRecorder.startRecording();
            if (localRecorder.getRecordingState() != AudioRecord.RECORDSTATE_RECORDING) {
                throw new IOException("Microphone did not start");
            }
            short[] buffer = new short[3200];
            while (captureRequested.get() && !destroyed) {
                int count = localRecorder.read(buffer, 0, buffer.length, AudioRecord.READ_BLOCKING);
                if (count < 0) {
                    if (!captureRequested.get()) break;
                    throw new IOException("Microphone read failed");
                }
                if (count == 0) continue;
                boolean segmentFinal = recognizer.acceptWaveForm(buffer, count);
                JSONObject hypothesis = new JSONObject(segmentFinal
                        ? recognizer.getResult() : recognizer.getPartialResult());
                String partial = hypothesis.optString(segmentFinal ? "text" : "partial", "").trim();
                if (segmentFinal) appendRecognized(completed, partial);
                String display = segmentFinal ? completed.toString() : combine(completed, partial);
                if (!display.equals(lastPublished)) {
                    emit("transcript", object("text", display, "final", segmentFinal));
                    lastPublished = display;
                }
                if (display.length() >= MAX_TEXT_LENGTH) {
                    captureRequested.set(false);
                    error("A conversa chegou a 8.000 caracteres. Inicie uma nova transcrição para continuar.");
                }
            }
            appendRecognized(completed, new JSONObject(recognizer.getFinalResult()).optString("text", ""));
            emit("transcript", object("text", completed.toString(), "final", true));
        } catch (IOException | RuntimeException | JSONException | LinkageError exception) {
            if (captureRequested.get() && !destroyed) {
                error("Não foi possível usar o microfone. Confira a permissão, se ele está liberado no aparelho e se outro aplicativo está usando o áudio.");
            }
        } finally {
            captureRequested.set(false);
            recorder = null;
            if (localRecorder != null) {
                try { localRecorder.stop(); } catch (IllegalStateException ignored) { }
                localRecorder.release();
            }
            if (recognizer != null) recognizer.close();
            emit("listening", object("active", false));
            captureBusy.set(false);
        }
    }

    private static void appendRecognized(StringBuilder completed, String text) {
        if (text == null || text.trim().isEmpty() || completed.length() >= MAX_TEXT_LENGTH) return;
        String suffix = (completed.length() == 0 ? "" : " ") + text.trim();
        int room = MAX_TEXT_LENGTH - completed.length();
        if (suffix.length() > room && room > 0 && Character.isHighSurrogate(suffix.charAt(room - 1))) room--;
        completed.append(suffix, 0, Math.min(room, suffix.length()));
    }

    private static String combine(StringBuilder completed, String partial) {
        StringBuilder full = new StringBuilder(completed);
        appendRecognized(full, partial);
        return full.toString();
    }

    private void stopCapture() {
        stopDeviceCapture();
        captureRequested.set(false);
        AudioRecord active = recorder;
        if (active != null) {
            try { active.stop(); } catch (IllegalStateException ignored) { }
        }
    }

    private JSONObject capabilities() {
        return object("native", true, "ttsReady", ttsReady, "ttsMessage", ttsMessage,
                "recognizerReady", recognizerReady, "recognizerMessage", recognizerMessage);
    }

    private void publishCapabilities() { emit("capabilities", capabilities()); }

    private void error(String message) { emit("error", object("message", message)); }

    private static JSONObject object(Object... pairs) {
        JSONObject value = new JSONObject();
        try {
            for (int index = 0; index < pairs.length; index += 2) {
                value.put((String) pairs[index], pairs[index + 1]);
            }
        } catch (JSONException impossible) {
            throw new IllegalArgumentException(impossible);
        }
        return value;
    }

    private void emit(String type, JSONObject payload) {
        main.post(() -> {
            if (!pageReady || destroyed || web == null) return;
            String script = "if(window.App&&typeof window.App.onNativeEvent==='function'){"
                    + "window.App.onNativeEvent(" + JSONObject.quote(type) + "," + payload + ");}";
            web.evaluateJavascript(script.replace("\u2028", "\\u2028").replace("\u2029", "\\u2029"), null);
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        resumed = true;
        if (ttsInitialized) {
            refreshOfflineVoice();
        } else if (ttsInitializationComplete) {
            if (tts != null) tts.shutdown();
            ttsInitializationComplete = false;
            initializeSpeech();
        }
        if (bundledModelUnavailable && !deviceRequested && !startAfterPermission) {
            initializeOnDeviceRecognizer();
        }
        if (startAfterPermission
                && checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            startAfterPermission = false;
            beginCapture();
        }
        publishCapabilities();
    }

    @Override
    protected void onPause() {
        resumed = false;
        stopCapture();
        stopSpeech();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        destroyed = true;
        startAfterPermission = false;
        stopCapture();
        if (tts != null) {
            tts.stop();
            tts.shutdown();
            tts = null;
        }
        if (onDeviceRecognizer != null) {
            onDeviceRecognizer.destroy();
            onDeviceRecognizer = null;
        }
        audioWorker.execute(() -> {
            Model loaded = model;
            model = null;
            if (loaded != null) loaded.close();
        });
        audioWorker.shutdown();
        if (web != null) {
            pageReady = false;
            web.removeJavascriptInterface("NativeBridge");
            web.stopLoading();
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}

'use strict';

const { app, BrowserWindow, session, protocol, ipcMain } = require('electron');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const fsp = fs.promises;
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

app.setName('Voz e Sinais');
app.setAppUserModelId('br.com.vozesinais.desktop');
protocol.registerSchemesAsPrivileged([{ scheme: 'voz', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);
const ORIGIN = 'voz://app';
const UI = path.join(__dirname, 'ui');
const ENGINE = path.join(__dirname, 'runtime', process.platform === 'win32' ? 'whisper-cli.exe' : 'whisper-cli');
const MODEL = path.join(__dirname, 'runtime', 'ggml-tiny.bin');
const MAX_CHARACTERS = 8000;
let window = null;
let voiceProcess = null;
let decodeProcess = null;
let sessionId = null;
let transcript = '';
let queue = [];
let decoding = false;
let closing = false;
let shutdownFinished = false;
let microphoneAllowed = false;
let temporaryRoot = null;
let capabilities = {
  native: true,
  ttsReady: false,
  ttsMessage: 'Instale uma voz de português do Brasil nas configurações de fala offline do computador.',
  recognizerReady: false,
  recognizerMessage: 'Preparando a transcrição offline do computador…'
};

function emit(type, payload) {
  if (window && !window.isDestroyed()) window.webContents.send('voice:event', type, payload);
}
function error(message) { emit('error', { message: message }); }
function publish() { emit('capabilities', capabilities); }
function trusted(event) {
  const sender = event.senderFrame;
  return !!window && event.sender === window.webContents && sender && sender.url.startsWith(ORIGIN + '/');
}
function requireTrusted(event) { if (!trusted(event)) throw new Error('Origem não autorizada.'); }

function stopSpeaking() {
  const active = voiceProcess; voiceProcess = null;
  if (active) active.kill();
  emit('speaking', { active: false });
}

function powerShell(args) {
  const executable = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  // The command is bundled application code only; user phrases travel through stdin JSON.
  const command = '& {\n' + fs.readFileSync(path.join(__dirname, 'speak-windows.ps1'), 'utf8') + '\n}' + (args.includes('-Probe') ? ' -Probe' : '');
  return spawn(executable, ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', command], { windowsHide: true, shell: false, stdio: ['pipe', 'pipe', 'pipe'] });
}

function initializeVoice() {
  if (process.platform !== 'win32') { publish(); return; }
  let output = '';
  const probe = powerShell(['-Probe']);
  const timeout = setTimeout(function () { probe.kill(); }, 10000);
  probe.stdout.on('data', function (chunk) { if (output.length < 4096) output += chunk.toString('utf8'); });
  probe.on('error', function () { clearTimeout(timeout); publish(); });
  probe.on('close', function (code) {
    clearTimeout(timeout);
    try {
      capabilities.ttsReady = code === 0 && JSON.parse(output.replace(/^\uFEFF/, '')).ready === true;
      if (capabilities.ttsReady) capabilities.ttsMessage = 'Voz offline em português pronta no Windows.';
    } catch (_) {}
    publish();
  });
  probe.stdin.end();
}

function speak(text) {
  stopSpeaking();
  if (!capabilities.ttsReady || process.platform !== 'win32') { error(capabilities.ttsMessage); return; }
  if (typeof text !== 'string' || !text.trim() || text.length > MAX_CHARACTERS) { error('Mensagem inválida ou muito longa.'); return; }
  const child = powerShell([]);
  voiceProcess = child;
  emit('speaking', { active: true });
  child.on('error', function () {
    if (voiceProcess !== child) return;
    voiceProcess = null; emit('speaking', { active: false });
    error('Não foi possível iniciar a voz offline do Windows.');
  });
  child.on('close', function (code) {
    if (voiceProcess !== child) return;
    voiceProcess = null; emit('speaking', { active: false });
    if (code !== 0) error('Não foi possível falar. Confira a voz pt-BR offline e o volume do computador.');
  });
  child.stdin.on('error', function () {});
  child.stdin.end(JSON.stringify({ text: text.trim() }));
}

function validateAudio(value) {
  if (!(value instanceof ArrayBuffer) || value.byteLength < 32044 || value.byteLength > 16000 * 2 * 15 + 44) return null;
  const buffer = Buffer.from(value);
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE' || buffer.toString('ascii', 36, 40) !== 'data') return null;
  if (buffer.readUInt16LE(20) !== 1 || buffer.readUInt16LE(22) !== 1 || buffer.readUInt32LE(24) !== 16000 || buffer.readUInt16LE(34) !== 16 || buffer.readUInt32LE(40) !== buffer.length - 44) return null;
  return buffer;
}

async function processQueue() {
  if (decoding || closing) return;
  decoding = true;
  emit('processing', { active: true });
  try {
    while (queue.length && !closing) {
      const item = queue.shift();
      if (item.id !== sessionId) continue;
      const directory = await fsp.mkdtemp(path.join(temporaryRoot, 'trecho-'));
      try {
        const wav = path.join(directory, 'audio.wav');
        const resultPath = path.join(directory, 'resultado');
        await fsp.writeFile(wav, item.audio, { mode: 0o600 });
        await new Promise(function (resolve, reject) {
          const child = spawn(ENGINE, ['-m', MODEL, '-f', wav, '-l', 'pt', '-t', '2', '-ng', '-nt', '-np', '-oj', '-of', resultPath], { windowsHide: true, shell: false, cwd: directory, stdio: ['ignore', 'ignore', 'pipe'] });
          decodeProcess = child;
          let diagnostic = '';
          child.stderr.on('data', function (data) { if (diagnostic.length < 4000) diagnostic += data.toString(); });
          const timeout = setTimeout(function () { child.kill(); reject(new Error('Tempo de transcrição excedido.')); }, 120000);
          child.on('error', function (failure) { clearTimeout(timeout); reject(failure); });
          child.on('close', function (code) {
            clearTimeout(timeout);
            if (decodeProcess === child) decodeProcess = null;
            if (code === 0) resolve(); else reject(new Error('Falha no motor de transcrição local.'));
          });
        });
        if (item.id !== sessionId || closing) continue;
        const result = JSON.parse(await fsp.readFile(resultPath + '.json', 'utf8'));
        const text = (Array.isArray(result.transcription) ? result.transcription.map(function (entry) { return typeof entry.text === 'string' ? entry.text.trim() : ''; }).join(' ') : '').trim();
        if (text) {
          transcript = (transcript + (transcript ? ' ' : '') + text).slice(0, MAX_CHARACTERS);
          emit('transcript', { text: transcript, final: true });
        }
        if (transcript.length >= MAX_CHARACTERS) {
          emit('capture:stop', {});
          error('A conversa chegou a 8.000 caracteres. Limpe ou inicie uma nova conversa para continuar.');
        }
      } catch (_) {
        if (item.id === sessionId && !closing) error('Não foi possível transcrever esse trecho no computador. Tente novamente; não houve envio para a internet.');
      } finally {
        await fsp.rm(directory, { recursive: true, force: true }).catch(function () {});
      }
    }
  } finally { decoding = false; emit('processing', { active: false }); }
}

function configureIpc() {
  ipcMain.on('voice:capabilities', function (event) { requireTrusted(event); event.returnValue = Object.assign({}, capabilities); });
  ipcMain.on('voice:speak', function (event, text) { requireTrusted(event); speak(text); });
  ipcMain.on('voice:stop-speaking', function (event) { requireTrusted(event); stopSpeaking(); });
  ipcMain.handle('voice:prepare-microphone', function (event) { requireTrusted(event); microphoneAllowed = true; return true; });
  ipcMain.handle('voice:start-listening', function (event) {
    requireTrusted(event);
    if (!capabilities.recognizerReady) throw new Error('Motor offline indisponível.');
    if (decoding || queue.length) {
      error('Aguarde a transcrição do trecho anterior terminar antes de ouvir novamente.');
      return null;
    }
    stopSpeaking();
    sessionId = crypto.randomUUID(); transcript = ''; queue = [];
    emit('transcript', { text: '', final: true });
    return sessionId;
  });
  ipcMain.handle('voice:audio', function (event, id, value) {
    requireTrusted(event);
    if (id !== sessionId) return false;
    const audio = validateAudio(value);
    if (!audio) throw new Error('Formato PCM inválido.');
    if (queue.length >= 3) { emit('capture:stop', {}); error('O computador precisa terminar de processar a conversa. Aguarde e comece novamente.'); return false; }
    queue.push({ id: id, audio: audio }); processQueue(); return true;
  });
  ipcMain.on('voice:stop-listening', function (event, id) {
    requireTrusted(event);
    if (id === sessionId) { microphoneAllowed = false; emit('listening', { active: false }); }
  });
  ipcMain.on('voice:cancel-microphone', function (event) { requireTrusted(event); microphoneAllowed = false; });
}

function setupProtocol() {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.mp4': 'video/mp4' };
  protocol.handle('voz', async function (request) {
    try {
      const url = new URL(request.url);
      if (url.hostname !== 'app' || request.method !== 'GET') return new Response('', { status: 403 });
      const relative = decodeURIComponent(url.pathname);
      const file = path.resolve(UI, '.' + relative);
      if (!file.startsWith(UI + path.sep) || relative.includes('\\') || file.includes('\0')) return new Response('', { status: 403 });
      return new Response(await fsp.readFile(file), { status: 200, headers: { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' } });
    } catch (_) { return new Response('', { status: 404 }); }
  });
}

async function createWindow() {
  const instance = new BrowserWindow({
    title: 'Voz e Sinais', width: 1180, height: 850, minWidth: 360, minHeight: 600,
    backgroundColor: '#f8f7f2', autoHideMenuBar: true, show: false,
    webPreferences: { preload: path.join(__dirname, 'preload-bundle.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true, spellcheck: false }
  });
  window = instance;
  instance.webContents.setWindowOpenHandler(function () { return { action: 'deny' }; });
  instance.webContents.on('will-navigate', function (event, url) { if (!url.startsWith(ORIGIN + '/')) event.preventDefault(); });
  instance.webContents.on('did-finish-load', function () { publish(); });
  instance.once('ready-to-show', function () { instance.show(); });
  instance.on('blur', function () { emit('capture:stop', {}); stopSpeaking(); });
  instance.on('closed', function () { if (window === instance) window = null; });
  await instance.loadURL(ORIGIN + '/index.html');
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', function () { if (window) { if (window.isMinimized()) window.restore(); window.focus(); } });
  app.whenReady().then(async function () {
    // Only our temporary namespace is cleaned, with the single-instance lock held.
    for (const entry of await fsp.readdir(os.tmpdir(), { withFileTypes: true })) {
      if (entry.isDirectory() && /^voz-e-sinais-[a-zA-Z0-9]{6}$/.test(entry.name) && fs.existsSync(path.join(os.tmpdir(), entry.name, '.desktop-owned'))) {
        await fsp.rm(path.join(os.tmpdir(), entry.name), { recursive: true, force: true }).catch(function () {});
      }
    }
    temporaryRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'voz-e-sinais-'));
    await fsp.writeFile(path.join(temporaryRoot, '.desktop-owned'), 'Voz e Sinais desktop\n', { mode: 0o600 });
    capabilities.recognizerReady = fs.existsSync(ENGINE) && fs.existsSync(MODEL) && fs.statSync(MODEL).size > 70000000;
    capabilities.recognizerMessage = capabilities.recognizerReady
      ? 'Transcrição offline pronta. O texto aparece por trechos de aproximadamente 10 segundos.'
      : 'O motor ou o modelo offline não foram encontrados. Extraia o pacote completo antes de abrir o aplicativo.';
    setupProtocol(); configureIpc();
    session.defaultSession.webRequest.onBeforeRequest(function (details, callback) { callback({ cancel: !details.url.startsWith(ORIGIN + '/') && !details.url.startsWith('data:') }); });
    session.defaultSession.setPermissionCheckHandler(function (webContents, permission, requestingOrigin) {
      return webContents === window?.webContents && permission === 'media' && requestingOrigin.startsWith(ORIGIN) && microphoneAllowed;
    });
    session.defaultSession.setPermissionRequestHandler(function (webContents, permission, callback, details) {
      callback(webContents === window?.webContents && permission === 'media' && microphoneAllowed && !!details.mediaTypes && details.mediaTypes.every(function (type) { return type === 'audio'; }));
    });
    await createWindow(); initializeVoice();
  }).catch(function () { app.quit(); });
}

app.on('window-all-closed', function () { app.quit(); });
app.on('before-quit', function (event) {
  if (shutdownFinished) return;
  event.preventDefault();
  if (closing) return;
  closing = true; queue = []; sessionId = null;
  const decoder = decodeProcess;
  stopSpeaking();
  const finished = decoder ? new Promise(function (resolve) {
    decoder.once('close', resolve);
    decoder.kill();
    setTimeout(resolve, 3000);
  }) : Promise.resolve();
  finished.then(async function () {
    if (temporaryRoot) await fsp.rm(temporaryRoot, { recursive: true, force: true }).catch(function () {});
    shutdownFinished = true; app.quit();
  });
});

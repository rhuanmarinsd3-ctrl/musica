'use strict';

const { contextBridge, ipcRenderer } = require('electron');
const AudioTools = globalThis.DesktopAudio;
let capabilities = ipcRenderer.sendSync('voice:capabilities');
let stream = null;
let audioContext = null;
let source = null;
let processor = null;
let silentGain = null;
let captureId = null;
let captureGeneration = 0;
let samples = [];
let sampleCount = 0;
let localVoice = null;
let localUtterance = null;
let processing = false;
const eventListeners = new Set();
const pendingEvents = [];
const CHUNK_SAMPLES = 16000 * 10;

function effectiveCapabilities() {
  const result = Object.assign({}, capabilities);
  if (!result.ttsReady && localVoice) {
    result.ttsReady = true;
    result.ttsMessage = 'Voz de português offline pronta neste computador.';
  }
  return result;
}

function emit(type, payload) {
  if (!eventListeners.size) {
    if (pendingEvents.length < 30) pendingEvents.push([type, payload]);
    return;
  }
  for (const listener of eventListeners) listener(type, payload);
}

function refreshLocalVoice() {
  if (!window.speechSynthesis) return;
  localVoice = window.speechSynthesis.getVoices().find(function (voice) {
    return voice.localService === true && /^pt[-_]BR$/i.test(voice.lang);
  }) || null;
  emit('capabilities', effectiveCapabilities());
}

ipcRenderer.on('voice:event', function (_, type, payload) {
  if (type === 'capabilities') {
    capabilities = payload;
    emit(type, effectiveCapabilities());
  } else if (type === 'processing') {
    processing = !!payload.active;
    emit(type, payload);
  } else if (type === 'capture:stop') {
    stopListening();
  } else emit(type, payload);
});

function stopSpeaking() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  localUtterance = null;
  ipcRenderer.send('voice:stop-speaking');
  emit('speaking', { active: false });
}

function speak(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text || text.length > 8000) {
    emit('error', { message: 'Escolha um cartão ou escreva uma mensagem de até 8.000 caracteres.' });
    return;
  }
  stopListening();
  stopSpeaking();
  if (capabilities.ttsReady) {
    ipcRenderer.send('voice:speak', text);
    return;
  }
  refreshLocalVoice();
  if (!localVoice) {
    emit('error', { message: effectiveCapabilities().ttsMessage });
    return;
  }
  localUtterance = new SpeechSynthesisUtterance(text);
  localUtterance.voice = localVoice;
  localUtterance.lang = 'pt-BR';
  localUtterance.rate = 0.9;
  localUtterance.onstart = function () { emit('speaking', { active: true }); };
  localUtterance.onend = function () { emit('speaking', { active: false }); };
  localUtterance.onerror = function () {
    emit('speaking', { active: false });
    emit('error', { message: 'Não foi possível falar. Confira a voz offline e o volume do computador.' });
  };
  window.speechSynthesis.speak(localUtterance);
}

function flushChunk(id) {
  if (!sampleCount || !id) return;
  const joined = new Int16Array(sampleCount);
  let offset = 0;
  for (const chunk of samples) { joined.set(chunk, offset); offset += chunk.length; }
  samples = []; sampleCount = 0;
  // Do not ask the model to hallucinate words for a muted microphone or a tiny fragment.
  if (joined.length < 16000 || AudioTools.speechEnergy(joined) < 0.003) return;
  const wave = AudioTools.waveBuffer(joined);
  ipcRenderer.invoke('voice:audio', id, wave).catch(function () {
    emit('error', { message: 'Não foi possível transcrever esse trecho. Tente falar novamente.' });
  });
}

async function startListening() {
  if (stream || captureId) { emit('listening', { active: true }); return; }
  if (!capabilities.recognizerReady) {
    emit('error', { message: capabilities.recognizerMessage });
    return;
  }
  if (processing) {
    emit('error', { message: 'Aguarde a transcrição do trecho anterior terminar antes de ouvir novamente.' });
    return;
  }
  const generation = ++captureGeneration;
  stopSpeaking();
  try {
    await ipcRenderer.invoke('voice:prepare-microphone');
    const requested = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false
    });
    if (generation !== captureGeneration) { requested.getTracks().forEach(function (track) { track.stop(); }); return; }
    stream = requested;
    captureId = await ipcRenderer.invoke('voice:start-listening');
    if (!captureId) { await stopListening(); return; }
    if (generation !== captureGeneration) { await stopListening(); return; }
    samples = []; sampleCount = 0;
    audioContext = new AudioContext({ sampleRate: 16000 });
    await audioContext.resume();
    source = audioContext.createMediaStreamSource(stream);
    processor = audioContext.createScriptProcessor(4096, 1, 1);
    silentGain = audioContext.createGain();
    silentGain.gain.value = 0;
    processor.onaudioprocess = function (event) {
      if (!captureId || generation !== captureGeneration) return;
      const pcm = AudioTools.toPcm16(event.inputBuffer.getChannelData(0), audioContext.sampleRate);
      samples.push(pcm); sampleCount += pcm.length;
      if (sampleCount >= CHUNK_SAMPLES) flushChunk(captureId);
    };
    source.connect(processor); processor.connect(silentGain); silentGain.connect(audioContext.destination);
    emit('listening', { active: true });
  } catch (_) {
    await stopListening();
    emit('error', { message: 'Não foi possível abrir o microfone. Permita o acesso nas configurações de privacidade do computador e tente novamente.' });
  }
}

async function stopListening() {
  ++captureGeneration;
  const finishedId = captureId;
  captureId = null;
  if (processor) { processor.onaudioprocess = null; processor.disconnect(); processor = null; }
  if (source) { source.disconnect(); source = null; }
  if (silentGain) { silentGain.disconnect(); silentGain = null; }
  if (stream) { stream.getTracks().forEach(function (track) { track.stop(); }); stream = null; }
  if (audioContext) { audioContext.close().catch(function () {}); audioContext = null; }
  flushChunk(finishedId);
  if (finishedId) ipcRenderer.send('voice:stop-listening', finishedId);
  ipcRenderer.send('voice:cancel-microphone');
  emit('listening', { active: false });
}

contextBridge.exposeInMainWorld('NativeBridge', Object.freeze({
  getCapabilities: function () { return JSON.stringify(effectiveCapabilities()); },
  speak: speak,
  stopSpeaking: stopSpeaking,
  startListening: startListening,
  stopListening: stopListening,
  subscribe: function (listener) {
    if (typeof listener !== 'function') return;
    eventListeners.add(listener);
    for (const event of pendingEvents.splice(0)) listener(event[0], event[1]);
    listener('capabilities', effectiveCapabilities());
  }
}));

window.addEventListener('DOMContentLoaded', function () {
  refreshLocalVoice();
  if (window.speechSynthesis) window.speechSynthesis.addEventListener('voiceschanged', refreshLocalVoice);
});
window.addEventListener('pagehide', function () { stopListening(); stopSpeaking(); });

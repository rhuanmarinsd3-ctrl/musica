(function (root) {
  'use strict';

  function toPcm16(samples, rate) {
    if (!(samples instanceof Float32Array) || !Number.isFinite(rate) || rate < 8000) {
      throw new TypeError('Formato de áudio inválido.');
    }
    const ratio = rate / 16000;
    const result = new Int16Array(Math.floor(samples.length / ratio));
    for (let index = 0; index < result.length; index++) {
      const position = index * ratio;
      const before = Math.floor(position);
      const weight = position - before;
      const value = samples[before] * (1 - weight) + samples[Math.min(before + 1, samples.length - 1)] * weight;
      result[index] = Math.round(Math.max(-1, Math.min(1, value)) * (value < 0 ? 32768 : 32767));
    }
    return result;
  }

  function waveBuffer(samples) {
    if (!(samples instanceof Int16Array)) throw new TypeError('Áudio PCM 16-bit necessário.');
    const result = new ArrayBuffer(44 + samples.byteLength);
    const view = new DataView(result);
    const text = function (offset, value) {
      for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
    };
    text(0, 'RIFF'); view.setUint32(4, 36 + samples.byteLength, true); text(8, 'WAVE');
    text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, 1, true); view.setUint32(24, 16000, true);
    view.setUint32(28, 32000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    text(36, 'data'); view.setUint32(40, samples.byteLength, true);
    for (let i = 0; i < samples.length; i++) view.setInt16(44 + i * 2, samples[i], true);
    return result;
  }

  function speechEnergy(samples) {
    if (!samples.length) return 0;
    let energy = 0;
    for (let i = 0; i < samples.length; i++) energy += samples[i] * samples[i];
    return Math.sqrt(energy / samples.length) / 32768;
  }

  const tools = Object.freeze({ toPcm16: toPcm16, waveBuffer: waveBuffer, speechEnergy: speechEnergy });
  if (typeof module !== 'undefined' && module.exports) module.exports = tools;
  else root.DesktopAudio = tools;
})(typeof globalThis !== 'undefined' ? globalThis : this);

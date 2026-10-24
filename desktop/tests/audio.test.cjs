'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const audio = require('../audio.js');

test('converte um segundo de áudio de 48 kHz em PCM 16 kHz sem mudar o tom', () => {
  const signal = new Float32Array(48000);
  for (let i = 0; i < signal.length; i++) signal[i] = 0.5 * Math.sin(2 * Math.PI * 1000 * i / 48000);
  const pcm = audio.toPcm16(signal, 48000);
  assert.equal(pcm.length, 16000);
  const changes = Array.from(pcm).filter((value, i) => i > 0 && value >= 0 && pcm[i - 1] < 0).length;
  assert.ok(changes >= 998 && changes <= 1000);
  assert.ok(Math.abs(audio.speechEnergy(pcm) - Math.sqrt(0.125)) < 0.001);
});

test('limita amostras e produz WAV PCM mono 16-bit que o Whisper recebe', () => {
  const pcm = audio.toPcm16(new Float32Array([-2, -1, 0, 1, 2]), 16000);
  assert.deepEqual(Array.from(pcm), [-32768, -32768, 0, 32767, 32767]);
  const wav = Buffer.from(audio.waveBuffer(pcm));
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
  assert.equal(wav.readUInt32LE(24), 16000);
  assert.equal(wav.readUInt16LE(22), 1);
  assert.equal(wav.readUInt16LE(34), 16);
  assert.equal(wav.readUInt32LE(40), 10);
  assert.equal(wav.length, 54);
  assert.equal(wav.readInt16LE(44), -32768);
});

test('silêncio tem energia zero e entradas de formato errado são rejeitadas', () => {
  assert.equal(audio.speechEnergy(new Int16Array(16000)), 0);
  assert.throws(() => audio.toPcm16([0, 1], 16000), TypeError);
  assert.throws(() => audio.toPcm16(new Float32Array(1), NaN), TypeError);
  assert.throws(() => audio.waveBuffer(new Float32Array(1)), TypeError);
});

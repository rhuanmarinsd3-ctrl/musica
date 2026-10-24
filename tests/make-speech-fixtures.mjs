// Development fixture generator; these synthetic voices are not bundled in the app.
// Usage: node tests/make-speech-fixtures.mjs ESPEAK_DIST_DIR OUTPUT_DIR
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const [distArg, outArg] = process.argv.slice(2);
if (!distArg || !outArg) throw new Error('Supply the eSpeak-NG distribution directory and output directory.');
const dist = resolve(distArg);
const output = resolve(outArg);
const { default: ESpeakNG } = await import(pathToFileURL(join(dist, 'espeak-ng.js')).href);
const wasmBinary = await readFile(join(dist, 'espeak-ng.wasm'));
const cases = [
  { id: 'food', expected: 'eu quero comida por gentileza', required: ['comida'], speed: 145 },
  { id: 'water', expected: 'eu quero água', required: ['agua'], speed: 145 },
  { id: 'negation', expected: 'eu não estou triste', required: ['nao', 'triste'], speed: 145 },
  { id: 'fear', expected: 'eu estou com medo', required: ['medo'], speed: 145 },
  { id: 'help', expected: 'eu preciso de ajuda por favor', required: ['ajuda'], speed: 160 },
  { id: 'slowly', expected: 'você pode falar mais devagar', required: ['devagar'], speed: 160 }
];
await mkdir(output, { recursive: true });
for (const fixture of cases) {
  const instance = await ESpeakNG({
    wasmBinary,
    arguments: ['-v', 'pt-br', '-s', String(fixture.speed), '-w', '/speech.wav', fixture.expected],
    printErr: (line) => process.stderr.write(String(line) + '\n')
  });
  const original = join(output, fixture.id + '-original.wav');
  await writeFile(original, instance.FS.readFile('/speech.wav'));
  const file = fixture.id + '.wav';
  const convert = spawnSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-i', original,
    '-af', 'adelay=300,apad=pad_dur=0.7', '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', join(output, file)], { encoding: 'utf8' });
  if (convert.status !== 0) throw new Error(convert.stderr || 'ffmpeg failed');
  fixture.file = file;
}
const report = { source: 'eSpeak-NG 1.0.2 WASM, pt-br, artificial speech',
  preparation: 'PCM 16-bit mono 16 kHz; 300 ms leading and 700 ms trailing silence',
  limitation: 'Synthetic speech only; this is not validation of human voices or of microphone capture.',
  maxWordErrorRate: 0.34, cases };
await writeFile(join(output, 'manifest.json'), JSON.stringify(report, null, 2) + '\n');
console.log('Generated ' + cases.length + ' synthetic Portuguese cases in ' + output);

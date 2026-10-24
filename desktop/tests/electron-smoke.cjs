'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { chromium } = require('../../node_modules/playwright');

async function main() {
  const root = path.resolve(__dirname, '../..');
  const executable = path.join(root, 'dist/pc/Voz-e-Sinais-Linux-x64/voz-e-sinais');
  const fixture = process.env.VOZ_DESKTOP_TEST_WAV || '/tmp/voz-qa-whisper/help.wav';
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'voz-desktop-check-'));
  const port = await new Promise(resolve => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => { const value = server.address().port; server.close(() => resolve(value)); });
  });
  const env = Object.assign({}, process.env, { XDG_CONFIG_HOME: path.join(temporary, 'config'), XDG_CACHE_HOME: path.join(temporary, 'cache') });
  let diagnostic = '';
  const child = spawn(executable, ['--no-sandbox', '--ozone-platform=headless', '--disable-gpu', '--remote-debugging-port=' + port,
    '--user-data-dir=' + path.join(temporary, 'profile'), '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
    '--use-file-for-fake-audio-capture=' + fixture + '%noloop'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stderr.on('data', data => { if (diagnostic.length < 60000) diagnostic += data.toString(); });
  child.stdout.on('data', data => { if (diagnostic.length < 60000) diagnostic += data.toString(); });
  let browser;
  let page;
  try {
    for (let i = 0; i < 60; i++) {
      if (child.exitCode !== null) throw new Error('Electron encerrou: ' + diagnostic.slice(-4000));
      try { browser = await chromium.connectOverCDP('http://127.0.0.1:' + port); break; } catch (_) { await new Promise(resolve => setTimeout(resolve, 200)); }
    }
    if (!browser) throw new Error('Electron não abriu DevTools: ' + diagnostic.slice(-4000));
    page = browser.contexts().flatMap(context => context.pages())[0];
    await page.waitForFunction(() => !!window.App && document.querySelectorAll('.communication-card').length >= 180);
    await page.evaluate(() => { window.desktopTestEvents = []; window.NativeBridge.subscribe((type, payload) => window.desktopTestEvents.push({ type, payload })); });
    const result = await page.evaluate(() => ({ url: location.href, cards: document.querySelectorAll('.communication-card').length,
      capabilities: JSON.parse(window.NativeBridge.getCapabilities()), nodeVisible: typeof require !== 'undefined' || typeof process !== 'undefined' }));
    assert.equal(result.url, 'voz://app/index.html');
    assert.equal(result.nodeVisible, false);
    assert.equal(result.capabilities.recognizerReady, true);
    await page.locator('#tab-write').click();
    await page.locator('#message-input').fill('Eu quero conversar sem usar um site.');
    assert.equal(await page.locator('#message-input').inputValue(), 'Eu quero conversar sem usar um site.');
    await page.locator('#tab-listen').click();
    await page.locator('#listen-toggle').click();
    await page.waitForFunction(() => window.App.getState().listening === true);
    await page.waitForTimeout(4200);
    await page.locator('#listen-toggle').click();
    await page.waitForFunction(() => window.App.getState().displayTranscript.length > 0, undefined, { timeout: 120000 });
    const transcript = await page.evaluate(() => window.App.getState().displayTranscript);
    assert.match(transcript, /ajuda/i);
    assert.match(transcript, /favor/i);
    await fs.mkdir(path.join(root, 'test-results'), { recursive: true });
    await page.screenshot({ path: path.join(root, 'test-results/desktop-electron.png') });
    console.log(JSON.stringify({ result, transcript, microphone: 'synthetic WAV capture, no physical microphone', windows: 'not executed on Linux' }, null, 2));
    await page.evaluate(() => window.close()).catch(() => {});
  } catch (error) {
    if (page) console.error('Estado:', await page.evaluate(() => ({ state: window.App && window.App.getState(), events: window.desktopTestEvents })).catch(() => null));
    console.error('Diagnóstico Electron:', diagnostic.slice(-10000));
    throw error;
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (child.exitCode === null) child.kill();
    await new Promise(resolve => { if (child.exitCode !== null) resolve(); else { child.once('exit', resolve); setTimeout(resolve, 4000); } });
    await fs.rm(temporary, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

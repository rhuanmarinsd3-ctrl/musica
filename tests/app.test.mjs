import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.json': 'application/json' };
let server;
let origin;
let browser;

before(async () => {
  server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      let file = resolve(project, '.' + decodeURIComponent(url.pathname));
      if (!file.startsWith(project + sep)) throw new Error('outside project');
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      const data = await readFile(file);
      res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream' });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  await new Promise((resolveReady) => server.listen(0, '127.0.0.1', resolveReady));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  await mkdir(join(project, 'test-results'), { recursive: true });
});

after(async () => {
  await browser?.close();
  await new Promise((done) => server ? server.close(done) : done());
});

async function openApp({ native = true, legacyDom = false, storage = {}, viewport = { width: 390, height: 844 } } = {}) {
  const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
  const page = await context.newPage();
  const errors = [];
  const externalRequests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (!request.url().startsWith(origin) && !request.url().startsWith('data:')) externalRequests.push(request.url());
  });
  await page.addInitScript(({ native, legacyDom, storage }) => {
    if (legacyDom) delete Element.prototype.replaceChildren;
    // Seed only the first visit so a reload still exercises actual persistence.
    if (Object.keys(storage).length && !sessionStorage.getItem('__qa_storage_seeded')) {
      Object.entries(storage).forEach(([key, value]) => localStorage.setItem(key, JSON.stringify(value)));
      sessionStorage.setItem('__qa_storage_seeded', 'true');
    }
    window.__nativeCalls = [];
    window.__unsafeRecognitionAttempts = 0;
    class UnsafeRecognition {
      constructor() {
        window.__unsafeRecognitionAttempts++;
        throw new Error('Network-backed speech recognition must not be used.');
      }
    }
    window.SpeechRecognition = UnsafeRecognition;
    window.webkitSpeechRecognition = UnsafeRecognition;
    if (!native) return;
    const caps = { native: true, ttsReady: true, ttsMessage: 'Voz offline disponível.', recognizerReady: true, recognizerMessage: 'Reconhecimento offline disponível.' };
    window.NativeBridge = {
      getCapabilities() { return JSON.stringify(caps); },
      speak(text) { window.__nativeCalls.push({ method: 'speak', text }); },
      stopSpeaking() { window.__nativeCalls.push({ method: 'stopSpeaking' }); },
      startListening() {
        window.__nativeCalls.push({ method: 'startListening' });
        window.App.onNativeEvent('listening', { active: true });
      },
      stopListening() {
        window.__nativeCalls.push({ method: 'stopListening' });
        window.App.onNativeEvent('listening', { active: false });
      }
    };
  }, { native, legacyDom, storage });
  await page.goto(origin + '/app/src/main/assets/web/');
  await page.waitForFunction(() => window.App && document.querySelector('#card-grid')?.childElementCount > 0);
  return {
    page,
    context,
    errors,
    externalRequests,
    async close() {
      assert.deepEqual(errors, [], 'interface must not emit JavaScript errors');
      assert.deepEqual(externalRequests, [], 'app must not request external resources');
      await context.close();
    }
  };
}

async function emit(page, type, payload) {
  await page.evaluate(({ type, payload }) => window.App.onNativeEvent(type, payload), { type, payload });
}

test('cartão de comida fala a frase completa e permite repeti-la', async () => {
  const app = await openApp();
  try {
    const { page } = app;
    await page.getByText('Quero comer', { exact: true }).click();
    assert.equal(await page.locator('#selected-phrase').innerText(), 'Eu quero comida, por gentileza.');
    let spoken = await page.evaluate(() => window.__nativeCalls.filter((call) => call.method === 'speak'));
    assert.deepEqual(spoken.map((call) => call.text), ['Eu quero comida, por gentileza.']);
    await page.locator('#repeat-phrase').click();
    spoken = await page.evaluate(() => window.__nativeCalls.filter((call) => call.method === 'speak'));
    assert.equal(spoken.length, 2);
    assert.equal(spoken[1].text, 'Eu quero comida, por gentileza.');
  } finally { await app.close(); }
});

test('catálogo oferece emoções diversas e mantém frases úteis de comunicação', async () => {
  const app = await openApp();
  try {
    const { page } = app;
    const cards = await page.evaluate(() => window.Catalog.cards.map(({ id, category, label, phrase, supportLabel }) => ({ id, category, label, phrase, supportLabel })));
    assert.ok(cards.length >= 180, 'the bundled catalogue must contain at least 180 distinct cards');
    assert.ok(cards.filter((card) => card.category === 'emotions').length >= 120, 'emotions must be expanded substantially');
    assert.equal(new Set(cards.map((card) => card.id)).size, cards.length, 'card identities must be unique');
    assert.equal(new Set(cards.map((card) => card.label)).size, cards.length, 'labels must identify distinct cards');
    for (const card of cards) {
      assert.equal(typeof card.phrase, 'string');
      assert.ok(card.phrase.trim().length > 0, 'each card must have something meaningful to speak');
      assert.equal(typeof card.supportLabel, 'string');
      assert.ok(card.supportLabel.trim().length > 0, 'keyword illustrations need a readable neutral caption');
    }
    for (const id of ['food', 'water', 'happy', 'sad', 'fear', 'angry', 'bathroom', 'help']) {
      assert.ok(cards.some((card) => card.id === id), 'core communication need preserved: ' + id);
    }
    assert.equal(await page.locator('#card-grid .communication-card').count(), cards.length);
  } finally { await app.close(); }
});

async function fillPersonalCard(page, label, phrase) {
  await page.locator('#custom-card-label').fill(label);
  await page.locator('#custom-card-phrase').fill(phrase);
  const image = page.locator('#custom-card-emojis button').first();
  await image.click();
  assert.ok((await page.locator('#custom-card-emoji-preview').innerText()).trim());
}

test('cartão pessoal pode ser criado, falado, favoritado, editado e excluído com persistência', async () => {
  const app = await openApp();
  try {
    const { page } = app;
    const label = 'Minha pausa';
    const phrase = 'Eu preciso de uma pausa para respirar, por gentileza.';
    await page.locator('#new-card').click();
    assert.equal(await page.locator('#custom-card-editor').isVisible(), true);
    await fillPersonalCard(page, label, phrase);
    await page.locator('#save-custom-card').click();
    assert.equal(await page.locator('#custom-card-editor').isVisible(), false);
    await page.locator('#card-search').fill('minha pausa');
    const card = page.locator('.communication-card').filter({ has: page.getByText(label, { exact: true }) });
    assert.equal(await card.count(), 1);
    const id = await card.getAttribute('data-card');
    await card.getByRole('button', { name: 'Falar: ' + phrase, exact: true }).click();
    assert.equal(await page.evaluate(() => window.__nativeCalls.filter((call) => call.method === 'speak').at(-1).text), phrase);
    await card.getByRole('button', { name: 'Adicionar aos favoritos: ' + label, exact: true }).click();
    await page.reload();
    await page.waitForFunction(() => window.App);
    await page.locator('#categories').getByRole('button', { name: 'Favoritos', exact: true }).click();
    assert.equal(await page.getByText(label, { exact: true }).count(), 1);
    await page.getByRole('button', { name: 'Falar: ' + phrase, exact: true }).click();
    await emit(page, 'speaking', { active: true });
    const stopCount = await page.evaluate(() => window.__nativeCalls.filter((call) => call.method === 'stopSpeaking').length);
    await page.getByRole('button', { name: 'Editar cartão: ' + label, exact: true }).click();
    const changedLabel = 'Meu tempo para respirar';
    const changedPhrase = 'Preciso de um minuto para respirar com calma.';
    await fillPersonalCard(page, changedLabel, changedPhrase);
    await page.locator('#save-custom-card').click();
    assert.ok(await page.evaluate(() => window.__nativeCalls.filter((call) => call.method === 'stopSpeaking').length) > stopCount, 'editing a selected spoken card must stop the old message');
    assert.equal(await page.locator('#selected-phrase').innerText(), changedPhrase);
    const changed = page.locator('.communication-card').filter({ has: page.getByText(changedLabel, { exact: true }) });
    assert.equal(await changed.getAttribute('data-card'), id, 'editing must preserve the card identity and its favorite');
    await page.reload();
    await page.waitForFunction(() => window.App);
    await page.locator('#categories').getByRole('button', { name: 'Favoritos', exact: true }).click();
    await page.getByRole('button', { name: 'Falar: ' + changedPhrase, exact: true }).click();
    assert.equal(await page.evaluate(() => window.__nativeCalls.filter((call) => call.method === 'speak').at(-1).text), changedPhrase);
    await page.getByRole('button', { name: 'Editar cartão: ' + changedLabel, exact: true }).click();
    await page.locator('#delete-custom-card').click();
    assert.equal(await page.locator('#custom-card-delete-confirmation').isVisible(), true);
    await page.locator('#cancel-delete-custom-card').click();
    assert.equal(await page.locator('#custom-card-editor').isVisible(), true, 'canceling deletion preserves the card');
    await page.locator('#delete-custom-card').click();
    await page.locator('#confirm-delete-custom-card').click();
    await page.reload();
    await page.waitForFunction(() => window.App);
    await page.locator('#categories').getByRole('button', { name: 'Favoritos', exact: true }).click();
    assert.equal(await page.locator('#cards-empty').isVisible(), true);
    assert.equal(await page.getByText(changedLabel, { exact: true }).count(), 0);
    assert.equal(await page.evaluate((deleted) => JSON.parse(localStorage.getItem('vozesinais.card-favorites.v1') || '[]').includes(deleted), id), false);
  } finally { await app.close(); }
});

test('editor trata texto pessoal literalmente e cancelar não cria um cartão', async () => {
  const app = await openApp();
  try {
    const { page } = app;
    const initialCount = await page.locator('#card-grid .communication-card').count();
    await page.locator('#new-card').click();
    await fillPersonalCard(page, 'Um cartão não salvo', 'Esta frase deve ser descartada.');
    await page.locator('#cancel-custom-card').click();
    assert.equal(await page.locator('#custom-card-editor').isVisible(), false);
    assert.equal(await page.locator('#card-grid .communication-card').count(), initialCount);
    await page.locator('#new-card').click();
    const label = '<img src=x onerror=alert(1)>';
    const phrase = '<svg onload="window.__injected=true">Minha mensagem.';
    await fillPersonalCard(page, label, phrase);
    await page.locator('#save-custom-card').click();
    await page.locator('#card-search').fill('minha mensagem');
    assert.equal(await page.getByText(label, { exact: true }).count(), 1);
    assert.equal(await page.locator('#card-grid img').count(), 0);
    assert.equal(await page.locator('#card-grid .card-label svg').count(), 0);
    await page.getByRole('button', { name: 'Falar: ' + phrase, exact: true }).click();
    assert.equal(await page.evaluate(() => window.__nativeCalls.filter((call) => call.method === 'speak').at(-1).text), phrase);
    assert.equal(await page.evaluate(() => window.__injected === true), false);
    await page.reload();
    await page.waitForFunction(() => window.App);
    await page.locator('#categories').getByRole('button', { name: 'Meus cartões', exact: true }).click();
    assert.equal(await page.getByText(label, { exact: true }).count(), 1);
    assert.equal(await page.locator('#card-grid img').count(), 0);
  } finally { await app.close(); }
});

test('editor impede nomes e frases vazios ou acima dos limites', async () => {
  const app = await openApp();
  try {
    const { page } = app;
    await page.locator('#new-card').click();
    assert.equal(await page.locator('#custom-card-label').getAttribute('maxlength'), '50');
    assert.equal(await page.locator('#custom-card-phrase').getAttribute('maxlength'), '500');
    for (const invalid of [
      { label: '   ', phrase: 'Uma frase válida.' },
      { label: 'Nome válido', phrase: '   ' },
      { label: 'N'.repeat(51), phrase: 'Uma frase válida.' },
      { label: 'Nome válido', phrase: 'F'.repeat(501) }
    ]) {
      await page.evaluate((value) => {
        for (const [id, text] of [['custom-card-label', value.label], ['custom-card-phrase', value.phrase]]) {
          const input = document.getElementById(id);
          input.value = text;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, invalid);
      if (await page.locator('#save-custom-card').isEnabled()) await page.locator('#save-custom-card').click();
      assert.equal(await page.locator('#custom-card-editor').isVisible(), true);
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('vozesinais.custom-cards.v1') || '[]').length), 0);
    }
    await fillPersonalCard(page, 'Nome válido', 'Uma mensagem válida.');
    await page.locator('#save-custom-card').click();
    assert.equal(await page.locator('#custom-card-editor').isVisible(), false);
  } finally { await app.close(); }
});

test('dados pessoais inválidos não derrubam catálogo nem injetam imagens', async () => {
  const app = await openApp({ storage: { 'vozesinais.custom-cards.v1': [null, {},
    { id: '__proto__', label: 'Nome', phrase: 'Texto', emoji: '<img src=x onerror=alert(1)>' },
    { id: 'broken', label: 'L'.repeat(51), phrase: 'Texto', emoji: '😊' },
    { id: 'broken-empty', label: '   ', phrase: 'Texto', emoji: '😊' }
  ] } });
  try {
    const { page } = app;
    assert.ok(await page.locator('#card-grid .communication-card').count() >= 180);
    assert.equal(await page.locator('#card-grid img').count(), 0);
    await page.locator('#new-card').click();
    await fillPersonalCard(page, 'Meu cartão após recuperar', 'Continuo podendo me comunicar.');
    await page.locator('#save-custom-card').click();
    await page.getByText('Meu cartão após recuperar', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__injected === true), false);
  } finally { await app.close(); }
});

test('nomes pessoais só com emoji não geram imagens para qualquer fala ou conversa vazia', async () => {
  const app = await openApp();
  try {
    const { page } = app;
    for (const [label, phrase] of [['😊', 'Quero sorrir com você.'], ['💛', 'Eu gosto de carinho.']]) {
      await page.locator('#new-card').click();
      await fillPersonalCard(page, label, phrase);
      await page.locator('#save-custom-card').click();
      assert.equal(await page.locator('#custom-card-editor').isVisible(), false);
    }
    assert.equal(await page.locator('#card-grid .communication-card').count(), 2);
    await page.locator('#tab-listen').click();
    await emit(page, 'transcript', { text: '', final: true });
    assert.equal(await page.locator('#image-matches').locator('>*').count(), 0);
    await emit(page, 'transcript', { text: 'xyzqv', final: true });
    assert.equal(await page.locator('#image-matches').locator('>*').count(), 0);
    await page.locator('#clear-transcript').click();
    assert.equal(await page.locator('#image-matches').locator('>*').count(), 0);
  } finally { await app.close(); }
});

test('limite de cartões pessoais preserva os existentes e permite editar sem criar extras', async () => {
  const seeded = Array.from({ length: 200 }, (_, index) => ({
    id: 'custom-seed-' + String(index).padStart(8, '0'), category: 'personal', emoji: '💬',
    label: 'Cartão pessoal ' + index, phrase: 'Mensagem pessoal de número ' + index + '.',
    supportLabel: 'Cartão pessoal ' + index, color: 'mint', keywords: ['pessoal'], custom: true
  }));
  const app = await openApp({ storage: { 'vozesinais.custom-cards.v1': seeded } });
  try {
    const { page } = app;
    await page.locator('#categories').getByRole('button', { name: 'Meus cartões', exact: true }).click();
    assert.equal(await page.locator('#card-grid .communication-card').count(), 200);
    if (await page.locator('#new-card').isEnabled()) {
      await page.locator('#new-card').click();
      if (await page.locator('#custom-card-editor').isVisible()) {
        await fillPersonalCard(page, 'Um cartão além do limite', 'Não deve substituir cartões existentes.');
        if (await page.locator('#save-custom-card').isEnabled()) await page.locator('#save-custom-card').click();
        assert.equal(await page.locator('#custom-card-editor').isVisible(), true);
        await page.locator('#cancel-custom-card').click();
      }
    }
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('vozesinais.custom-cards.v1')).length), 200);
    await page.getByRole('button', { name: 'Editar cartão: Cartão pessoal 0', exact: true }).click();
    await fillPersonalCard(page, 'Cartão pessoal revisado', 'Minha mensagem atualizada.');
    await page.locator('#save-custom-card').click();
    assert.equal(await page.getByText('Cartão pessoal revisado', { exact: true }).count(), 1);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('vozesinais.custom-cards.v1')).length), 200);
  } finally { await app.close(); }
});

test('busca sem acentos, categorias e estado vazio funcionam', async () => {
  const app = await openApp();
  try {
    const { page } = app;
    await page.locator('#card-search').fill('AGUA');
    await page.getByText('Quero água', { exact: true }).waitFor();
    assert.equal(await page.getByText('Quero comer', { exact: true }).count(), 0);
    await page.locator('#card-search').fill('xxyzqv');
    assert.equal(await page.locator('#cards-empty').isVisible(), true);
    await page.locator('#reset-search').click();
    await page.getByText('Quero comer', { exact: true }).waitFor();
    await page.locator('#categories').getByRole('button', { name: /Sinto que/ }).click();
    await page.getByText('Estou feliz', { exact: true }).waitFor();
    assert.equal(await page.getByText('Quero comer', { exact: true }).count(), 0);
  } finally { await app.close(); }
});

test('abas podem ser trocadas pelo teclado sem mouse', async () => {
  const app = await openApp();
  try {
    const { page } = app;
    await page.locator('#tab-communicate').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#tab-write').getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('#panel-write').isVisible(), true);
    await page.keyboard.press('End');
    assert.equal(await page.locator('#tab-listen').getAttribute('aria-selected'), 'true');
    await page.keyboard.press('Home');
    assert.equal(await page.locator('#tab-communicate').getAttribute('aria-selected'), 'true');
  } finally { await app.close(); }
});

test('cartões favoritos persistem sem disparar fala ao tocar no coração', async () => {
  const app = await openApp();
  try {
    const { page } = app;
    await page.getByRole('button', { name: 'Adicionar aos favoritos: Quero água', exact: true }).click();
    assert.equal(await page.evaluate(() => window.__nativeCalls.some((call) => call.method === 'speak')), false);
    await page.locator('#categories').getByRole('button', { name: 'Favoritos', exact: true }).click();
    assert.equal(await page.locator('#card-grid .communication-card').count(), 1);
    assert.equal(await page.getByText('Quero água', { exact: true }).isVisible(), true);
    await page.reload();
    await page.waitForFunction(() => window.App);
    await page.locator('#categories').getByRole('button', { name: 'Favoritos', exact: true }).click();
    assert.equal(await page.locator('#card-grid .communication-card').count(), 1);
    await page.getByRole('button', { name: 'Remover dos favoritos: Quero água', exact: true }).click();
    assert.equal(await page.locator('#cards-empty').isVisible(), true);
  } finally { await app.close(); }
});

test('interface funciona sem replaceChildren em WebView antiga', async () => {
  const app = await openApp({ legacyDom: true });
  try {
    const { page } = app;
    assert.equal(await page.evaluate(() => 'replaceChildren' in Element.prototype), false);
    assert.ok(await page.locator('#card-grid .communication-card').count() >= 180, 'broad catalogue must render in a legacy WebView');
    await page.locator('#card-search').fill('quero agua');
    assert.equal(await page.locator('#card-grid .communication-card').count(), 1);
    await page.getByRole('button', { name: 'Adicionar aos favoritos: Quero água', exact: true }).click();
    await page.locator('#card-search').fill('');
    await page.locator('#categories').getByRole('button', { name: 'Favoritos', exact: true }).click();
    assert.equal(await page.locator('#card-grid .communication-card').count(), 1);
    assert.equal(await page.getByText('Quero água', { exact: true }).isVisible(), true);
    await page.locator('#tab-write').click();
    await page.locator('#message-input').fill('Esta frase fica no aparelho.');
    await page.locator('#save-message').click();
    assert.match(await page.locator('#saved-phrases').innerText(), /Esta frase fica no aparelho\./);
    await page.locator('#tab-listen').click();
    await emit(page, 'transcript', { text: 'Eu quero água.', final: true });
    assert.equal(await page.locator('#transcript-text').innerText(), 'Eu quero água.');
    assert.equal(await page.locator('#image-matches').locator('>*').count() > 0, true);
    await page.locator('[data-format="libras"]').click();
    assert.equal(await page.locator('#libras-output').isVisible(), true);
    assert.equal(await page.evaluate(() => 'replaceChildren' in Element.prototype), false);
  } finally { await app.close(); }
});

test('texto livre fala literalmente, salva localmente e pode ser removido', async () => {
  const app = await openApp();
  try {
    const { page } = app;
    const phrase = 'Quero conversar. <img src=x onerror="window.__injected=true">';
    await page.locator('#tab-write').click();
    assert.equal(await page.locator('#speak-message').isDisabled(), true);
    await page.locator('#message-input').fill(phrase);
    await page.locator('#speak-message').click();
    assert.equal(await page.evaluate(() => window.__nativeCalls.filter((call) => call.method === 'speak').at(-1).text), phrase);
    await page.locator('#save-message').click();
    assert.equal(await page.locator('#saved-phrases').innerText().then((s) => s.includes(phrase)), true);
    assert.equal(await page.locator('#saved-phrases img').count(), 0);
    assert.equal(await page.evaluate(() => window.__injected === true), false);
    await page.reload();
    await page.waitForFunction(() => window.App);
    await page.locator('#tab-write').click();
    assert.equal(await page.locator('#saved-phrases').innerText().then((s) => s.includes(phrase)), true);
    await page.locator('#message-input').fill('Texto descartável');
    await page.locator('#clear-message').click();
    assert.equal(await page.locator('#message-input').inputValue(), '');
    assert.equal(await page.locator('#speak-message').isDisabled(), true);
  } finally { await app.close(); }
});

test('navegador não tenta reconhecimento online e explica o microfone Android', async () => {
  const app = await openApp({ native: false });
  try {
    const { page } = app;
    await page.locator('#tab-listen').click();
    const notice = await page.locator('#recognizer-notice').innerText();
    assert.match(notice, /Android/i);
    if (!(await page.locator('#listen-toggle').isDisabled())) await page.locator('#listen-toggle').click();
    assert.equal(await page.evaluate(() => window.__unsafeRecognitionAttempts), 0);
    assert.equal(await page.evaluate(() => window.App.getState().listening), false);
  } finally { await app.close(); }
});

test('leitura de texto longo pode ser interrompida na mesma tela', async () => {
  const app = await openApp();
  try {
    const { page } = app;
    await page.locator('#tab-write').click();
    await page.locator('#message-input').fill('Quero compartilhar uma mensagem com você.');
    await page.locator('#speak-message').click();
    await emit(page, 'speaking', { active: true });
    assert.equal(await page.locator('#stop-message-speech').isVisible(), true);
    await page.locator('#stop-message-speech').click();
    assert.equal(await page.evaluate(() => window.__nativeCalls.some((call) => call.method === 'stopSpeaking')), true);
    assert.equal(await page.evaluate(() => window.App.getState().speaking), false);
    assert.equal(await page.locator('#stop-message-speech').isVisible(), false);
  } finally { await app.close(); }
});

test('processamento local tem indicador e não inicia outra escuta até concluir', async () => {
  const app = await openApp();
  try {
    const { page } = app;
    await page.locator('#tab-listen').click();
    await page.locator('#listen-toggle').click();
    await emit(page, 'processing', { active: true });
    assert.equal(await page.evaluate(() => window.App.getState().processing), true);
    assert.equal(await page.locator('#listen-toggle').isEnabled(), true, 'an ongoing capture must still be stoppable');
    await page.locator('#listen-toggle').click();
    assert.equal(await page.evaluate(() => window.App.getState().listening), false);
    assert.match(await page.locator('#listen-status').innerText(), /transcrev|process|interpret|convert/i);
    assert.equal(await page.locator('#listen-toggle').isDisabled(), true, 'a second decoder session must not race the pending one');
    await emit(page, 'transcript', { text: 'Eu quero água, por gentileza.', final: true });
    await emit(page, 'processing', { active: false });
    assert.equal(await page.locator('#listen-toggle').isEnabled(), true);
    assert.equal(await page.locator('#transcript-text').innerText(), 'Eu quero água, por gentileza.');
    assert.equal(await page.evaluate(() => window.App.getState().processing), false);
  } finally { await app.close(); }
});

test('transcrição cumulativa não duplica frases e mantém negações nos três modos', async () => {
  const app = await openApp();
  try {
    const { page } = app;
    await page.locator('#tab-listen').click();
    await page.locator('#listen-toggle').click();
    assert.equal(await page.locator('#listen-toggle').getAttribute('aria-pressed'), 'true');
    await emit(page, 'transcript', { text: 'Bom', final: false });
    assert.match(await page.locator('#transcript-interim').innerText(), /Bom/);
    await emit(page, 'transcript', { text: 'Bom dia.', final: true });
    await emit(page, 'transcript', { text: 'Bom dia. Eu não estou', final: false });
    await emit(page, 'transcript', { text: 'Bom dia. Eu não estou triste e quero água.', final: true });
    const transcript = 'Bom dia. Eu não estou triste e quero água.';
    assert.equal(await page.locator('#transcript-text').innerText(), transcript);
    assert.equal(await page.locator('#transcript-interim').innerText(), '');
    await page.locator('[data-format="text"]').click();
    assert.equal(await page.locator('#image-output').isVisible(), false);
    assert.equal(await page.locator('#transcript-text').innerText(), transcript);
    await page.locator('[data-format="images"]').click();
    assert.equal(await page.locator('#image-output').isVisible(), true);
    assert.equal(await page.locator('#image-matches').locator('>*').count() > 0, true);
    assert.match(await page.locator('#image-output').innerText(), /negações/i);
    await page.screenshot({ path: join(project, 'test-results', 'app-ouvir-mobile.png'), fullPage: true });
    await page.locator('.transcript-heading').evaluate((element) => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.screenshot({ path: join(project, 'test-results', 'app-ouvir-viewport.png') });
    await page.locator('[data-format="libras"]').click();
    assert.equal(await page.locator('#libras-output').isVisible(), true);
    assert.match(await page.locator('#libras-output').innerText(), /não.*disponível|não tem.*validada/i);
    assert.equal(await page.locator('#libras-output video').count(), 0);
    assert.equal(await page.locator('#transcript-text').innerText(), transcript);
    await page.locator('#listen-toggle').click();
    assert.equal(await page.locator('#listen-toggle').getAttribute('aria-pressed'), 'false');
    await page.locator('#clear-transcript').click();
    assert.equal(await page.evaluate(() => window.App.getState().transcript), '');
  } finally { await app.close(); }
});

test('fala transcrita é texto seguro, sem interpretar HTML', async () => {
  const app = await openApp();
  try {
    const { page } = app;
    await page.locator('#tab-listen').click();
    const literal = '<img src=x onerror="window.__injected=true"> Eu quero comida.';
    await emit(page, 'transcript', { text: literal, final: true });
    assert.equal(await page.locator('#transcript-text').innerText(), literal);
    assert.equal(await page.locator('#transcript-text img').count(), 0);
    assert.equal(await page.evaluate(() => window.__injected === true), false);
  } finally { await app.close(); }
});

test('resultado final atrasado não restaura conversa apagada e nova escuta funciona', async () => {
  const app = await openApp();
  try {
    const { page } = app;
    await page.locator('#tab-listen').click();
    await page.locator('#listen-toggle').click();
    await emit(page, 'transcript', { text: 'Conversa que será apagada.', final: true });
    await emit(page, 'processing', { active: true });
    await page.locator('#listen-toggle').click();
    assert.equal(await page.evaluate(() => window.App.getState().listening), false);
    assert.equal(await page.locator('#clear-transcript').isEnabled(), true);
    await page.locator('#clear-transcript').click();
    assert.equal(await page.evaluate(() => window.App.getState().transcript), '');
    await emit(page, 'transcript', { text: 'Conversa que será apagada. Resultado tardio.', final: true });
    assert.equal(await page.evaluate(() => window.App.getState().transcript), '');
    assert.equal(await page.evaluate(() => window.App.getState().displayTranscript), '');
    assert.equal(await page.locator('#transcript-text').innerText(), 'A fala vai aparecer aqui, em português.');
    assert.equal(await page.locator('#image-matches').locator('>*').count(), 0);
    assert.equal(await page.locator('#listen-toggle').isDisabled(), true);
    await emit(page, 'processing', { active: false });
    await page.locator('#listen-toggle').click();
    await emit(page, 'transcript', { text: 'Uma nova conversa.', final: true });
    assert.equal(await page.evaluate(() => window.App.getState().listening), true);
    assert.equal(await page.locator('#transcript-text').innerText(), 'Uma nova conversa.');
    await page.locator('#listen-toggle').click();
  } finally { await app.close(); }
});

test('microfone indisponível e falha ao abrir mantêm estado utilizável sem reconhecimento online', async () => {
  const app = await openApp();
  try {
    const { page } = app;
    await page.locator('#tab-listen').click();
    await emit(page, 'capabilities', { recognizerReady: false, recognizerMessage: 'Permita o microfone nas configurações do aparelho.' });
    await emit(page, 'capabilities', '{invalid-json');
    await emit(page, 'capabilities', { recognizerReady: 'true' });
    await page.locator('#listen-toggle').click();
    assert.equal(await page.evaluate(() => window.__nativeCalls.filter((call) => call.method === 'startListening').length), 0);
    assert.match(await page.locator('#recognizer-notice').innerText(), /microfone/i);
    await emit(page, 'capabilities', { recognizerReady: true, recognizerMessage: 'Reconhecimento offline disponível.' });
    await page.evaluate(() => {
      window.NativeBridge.startListening = () => window.__nativeCalls.push({ method: 'startListening' });
    });
    await page.locator('#listen-toggle').click();
    assert.equal(await page.evaluate(() => window.App.getState().listenPending), true);
    assert.equal(await page.locator('#listen-toggle').isDisabled(), true);
    await emit(page, 'error', { message: 'O microfone está sendo usado por outro aplicativo.' });
    assert.equal(await page.evaluate(() => window.App.getState().listenPending), false);
    assert.equal(await page.evaluate(() => window.App.getState().listening), false);
    assert.equal(await page.locator('#listen-toggle').isEnabled(), true);
    assert.equal(await page.evaluate(() => window.__unsafeRecognitionAttempts), 0);
    assert.equal(await page.evaluate(() => window.App.getState().displayTranscript), '');
    assert.match(await page.locator('#toast').innerText(), /microfone/i);
  } finally { await app.close(); }
});

test('microfone exige ação e para ao sair da tela de escuta', async () => {
  const app = await openApp();
  try {
    const { page } = app;
    assert.equal(await page.evaluate(() => window.__nativeCalls.some((call) => call.method === 'startListening')), false);
    await page.locator('#tab-listen').click();
    assert.equal(await page.evaluate(() => window.__nativeCalls.some((call) => call.method === 'startListening')), false);
    await page.locator('#listen-toggle').click();
    assert.equal(await page.evaluate(() => window.App.getState().listening), true);
    await page.locator('#tab-write').click();
    assert.equal(await page.evaluate(() => window.__nativeCalls.some((call) => call.method === 'stopListening')), true);
    assert.equal(await page.evaluate(() => window.App.getState().listening), false);
  } finally { await app.close(); }
});

test('sem voz offline disponível a interface não solicita fala nativa', async () => {
  const app = await openApp();
  try {
    const { page } = app;
    await emit(page, 'capabilities', { native: true, ttsReady: false, ttsMessage: 'Instale uma voz offline em português nas configurações do Android.', recognizerReady: true, recognizerMessage: 'Reconhecimento offline disponível.' });
    await page.getByText('Quero comer', { exact: true }).click();
    assert.equal(await page.evaluate(() => window.__nativeCalls.some((call) => call.method === 'speak')), false);
    await page.locator('#tab-write').click();
    assert.match(await page.locator('#voice-notice').innerText(), /voz offline/i);
  } finally { await app.close(); }
});

test('layout funciona em celular e desktop sem recursos externos', async () => {
  for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
    const app = await openApp({ viewport });
    try {
      const { page } = app;
      for (const tab of ['communicate', 'write', 'listen']) {
        await page.locator(`#tab-${tab}`).click();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${tab} at ${viewport.width}px must not overflow`);
      }
      await page.locator('#tab-communicate').click();
      await page.locator('#new-card').click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `personal card editor at ${viewport.width}px must not overflow`);
      await page.locator('#cancel-custom-card').click();
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: join(project, 'test-results', `app-${viewport.width}.png`), fullPage: true });
      await page.screenshot({ path: join(project, 'test-results', `app-viewport-${viewport.width}.png`) });
      if (viewport.width === 390) await page.screenshot({ path: join(project, 'test-results', 'app-mobile-viewport.png') });
    } finally { await app.close(); }
  }
});

test('site informa publicação pendente e não oferece download inexistente', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const externalRequests = [];
  page.on('request', (request) => { if (!request.url().startsWith(origin)) externalRequests.push(request.url()); });
  await page.route('**/downloads/voz-e-sinais-demo.apk', (route) => route.fulfill({ status: 404 }));
  try {
    await page.goto(origin + '/site/');
    await page.getByText('O APK ainda não está disponível neste site.', { exact: true }).waitFor();
    assert.equal(await page.locator('#download-apk').isDisabled(), true);
    assert.match(await page.locator('.store-state').innerText(), /Google Play.*Em preparação/s);
    assert.match(await page.locator('.download-detail').innerText(), /não inclui tradução para Libras/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    await page.screenshot({ path: join(project, 'test-results', 'site-390.png'), fullPage: true });
    await page.getByRole('link', { name: 'Política de privacidade', exact: true }).click();
    await page.getByRole('heading', { name: 'Política de privacidade', exact: true }).waitFor();
    assert.match(await page.locator('main').innerText(), /não envia suas conversas para servidores/i);
    assert.deepEqual(externalRequests, []);
  } finally { await context.close(); }
});

test('download só é habilitado para um APK disponível, sem confundir erro HTML', async () => {
  for (const { type, enabled } of [
    { type: 'text/html; charset=utf-8', enabled: false },
    { type: 'application/vnd.android.package-archive', enabled: true }
  ]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    await page.route('**/downloads/voz-e-sinais-demo.apk', (route) => route.fulfill({ status: 200, headers: { 'content-type': type, 'content-length': '128' }, body: '' }));
    try {
      await page.goto(origin + '/site/');
      await page.waitForFunction(() => !document.getElementById('download-status').textContent.includes('Verificando'));
      assert.equal(await page.locator('#download-apk').isEnabled(), enabled);
      if (enabled) await page.screenshot({ path: join(project, 'test-results', 'site-1440.png'), fullPage: true });
    } finally { await context.close(); }
  }
});

test('interface não apresenta violações automáticas de WCAG AA', async () => {
  const app = await openApp({ viewport: { width: 1440, height: 1000 } });
  const issues = [];
  try {
    const { page } = app;
    for (const tab of ['communicate', 'write', 'listen']) {
      await page.locator(`#tab-${tab}`).click();
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      issues.push(...violations.map((v) => ({ tab, rule: v.id, impact: v.impact, nodes: v.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })) })));
    }
    await page.locator('#tab-communicate').click();
    await page.locator('#new-card').click();
    const editor = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    issues.push(...editor.violations.map((v) => ({ tab: 'personal-card-editor', rule: v.id, impact: v.impact, nodes: v.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })) })));
    assert.deepEqual(issues, []);
  } finally { await app.close(); }
});

test('site não apresenta violações automáticas de WCAG AA', async () => {
  const issues = [];
  for (const path of ['/site/', '/site/privacidade.html']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    try {
      await page.goto(origin + path);
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      issues.push(...violations.map((v) => ({ path, rule: v.id, impact: v.impact, nodes: v.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })) })));
    } finally { await context.close(); }
  }
  assert.deepEqual(issues, []);
});

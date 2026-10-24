(function () {
  'use strict';

  const catalog = window.Catalog;
  const $ = function (id) { return document.getElementById(id); };
  const bridge = window.NativeBridge;
  const storageKeys = { favorites: 'vozesinais.card-favorites.v1', phrases: 'vozesinais.saved-phrases.v1', cards: 'vozesinais.custom-cards.v1' };
  const customLimit = 200;
  const emojiPalette = catalog.emojiPalette || ['💬', '😊', '😢', '😠', '😨', '😌', '🥰', '😟', '🤗', '😴', '🙋', '💧', '🍽️', '🏠', '🩺', '🎵', '📚', '⚽', '🌳', '🎨', '👍', '✋', '💛', '⭐'];
  const routes = { communicate: 'comunicar', write: 'escrever', listen: 'ouvir' };
  const native = !!bridge;
  let toastTimer;
  let browserVoice = null;
  let utterance = null;
  let editingCardId = null;
  let editorEmoji = '💬';
  let editorReturnTarget = null;
  let editorInitial = null;

  function readStored(key) {
    try {
      const value = JSON.parse(window.localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (_) { return []; }
  }

  function readCustomCards() {
    const seen = new Set();
    return readStored(storageKeys.cards).filter(function (card) {
      if (!card || typeof card !== 'object' || typeof card.id !== 'string' || !/^custom-[a-z0-9-]{8,70}$/.test(card.id) || seen.has(card.id)) return false;
      if (typeof card.label !== 'string' || !card.label.trim() || card.label.length > 50 || typeof card.phrase !== 'string' || !card.phrase.trim() || card.phrase.length > 500 || emojiPalette.indexOf(card.emoji) === -1) return false;
      seen.add(card.id);
      return true;
    }).slice(0, customLimit).map(function (card) {
      return { id: card.id, category: 'personal', emoji: card.emoji, label: card.label.trim(), phrase: card.phrase.trim(), keywords: [card.label.trim()], supportLabel: card.label.trim(), color: 'mint', custom: true };
    });
  }

  const initialCustomCards = readCustomCards();

  const state = {
    tab: 'communicate',
    category: 'all',
    query: '',
    format: 'images',
    selectedPhrase: '',
    selectedCardId: '',
    listening: false,
    listenPending: false,
    processing: false,
    speaking: false,
    transcript: '',
    interimTranscript: '',
    displayTranscript: '',
    ignoreTranscriptUntilNextStart: false,
    customCards: initialCustomCards,
    favorites: Array.from(new Set(readStored(storageKeys.favorites).filter(function (id) { return catalog.cards.concat(initialCustomCards).some(function (card) { return card.id === id; }); }))),
    savedPhrases: Array.from(new Set(readStored(storageKeys.phrases).filter(function (phrase) { return typeof phrase === 'string' && phrase.trim().length > 0 && phrase.length <= 1000; }))).slice(0, 30),
    capabilities: {
      native: native,
      ttsReady: false,
      ttsMessage: native ? 'Preparando a voz do aparelho…' : 'Para falar sem internet, é preciso ter uma voz em português instalada no aparelho.',
      recognizerReady: false,
      recognizerMessage: native ? 'Preparando o reconhecimento de voz…' : 'O microfone offline está disponível no aplicativo Android.'
    }
  };

  function icon(name, className) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'icon' + (className ? ' ' + className : ''));
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#icon-' + name);
    svg.appendChild(use);
    return svg;
  }

  function textElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  // Android 8's original WebView predates Element.replaceChildren.
  function replaceContents(element, fragment) {
    while (element.firstChild) element.removeChild(element.firstChild);
    if (fragment) element.appendChild(fragment);
  }

  function toast(message) {
    window.clearTimeout(toastTimer);
    $('toast').textContent = String(message || '');
    $('toast').hidden = !message;
    if (message) toastTimer = window.setTimeout(function () { $('toast').hidden = true; }, 6500);
  }

  function persist(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) {
      toast('Não foi possível salvar neste aparelho. Confira se há espaço disponível.');
      return false;
    }
  }

  function callNative(method) {
    const args = Array.prototype.slice.call(arguments, 1);
    try {
      if (!bridge || typeof bridge[method] !== 'function') throw new Error('Função indisponível');
      return bridge[method].apply(bridge, args);
    } catch (_) {
      state.listenPending = false;
      renderListening();
      toast('Não foi possível usar essa função agora. Tente novamente.');
      return null;
    }
  }

  function renderCategories() {
    const container = $('categories');
    replaceContents(container);
    catalog.categories.forEach(function (category) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'category-button';
      button.dataset.category = category.id;
      button.setAttribute('aria-pressed', String(state.category === category.id));
      const decoration = textElement('span', '', category.icon);
      decoration.setAttribute('aria-hidden', 'true');
      button.append(decoration, textElement('span', '', category.label));
      button.addEventListener('click', function () {
        state.category = category.id;
        container.querySelectorAll('button').forEach(function (item) { item.setAttribute('aria-pressed', String(item.dataset.category === state.category)); });
        renderCards();
      });
      container.appendChild(button);
    });
  }

  function toggleFavorite(card, button) {
    const next = state.favorites.indexOf(card.id) === -1 ? state.favorites.concat(card.id) : state.favorites.filter(function (id) { return id !== card.id; });
    if (!persist(storageKeys.favorites, next)) return;
    state.favorites = next;
    const selected = next.indexOf(card.id) !== -1;
    button.setAttribute('aria-pressed', String(selected));
    button.setAttribute('aria-label', (selected ? 'Remover dos favoritos: ' : 'Adicionar aos favoritos: ') + card.label);
    toast(selected ? 'Cartão adicionado aos favoritos.' : 'Cartão removido dos favoritos.');
    if (state.category === 'favorites') renderCards();
  }

  function renderCards() {
    const cards = catalog.searchCards(state.query, state.category, state.favorites, state.customCards);
    const container = $('card-grid');
    const fragment = document.createDocumentFragment();
    cards.forEach(function (card) {
      const wrapper = textElement('div', 'communication-card color-' + card.color + (state.selectedCardId === card.id ? ' selected' : ''));
      wrapper.dataset.card = card.id;
      const action = document.createElement('button');
      action.type = 'button';
      action.className = 'card-action';
      action.setAttribute('aria-label', 'Falar: ' + card.phrase);
      const emoji = textElement('span', 'card-emoji', card.emoji);
      emoji.setAttribute('aria-hidden', 'true');
      action.append(emoji, textElement('span', 'card-label', card.label));
      action.addEventListener('click', function () {
        state.selectedCardId = card.id;
        container.querySelectorAll('.communication-card').forEach(function (item) { item.classList.toggle('selected', item.dataset.card === card.id); });
        speak(card.phrase);
      });
      const favorite = document.createElement('button');
      const isFavorite = state.favorites.indexOf(card.id) !== -1;
      favorite.type = 'button';
      favorite.className = 'card-favorite';
      favorite.setAttribute('aria-pressed', String(isFavorite));
      favorite.setAttribute('aria-label', (isFavorite ? 'Remover dos favoritos: ' : 'Adicionar aos favoritos: ') + card.label);
      favorite.appendChild(icon('heart'));
      favorite.addEventListener('click', function () { toggleFavorite(card, favorite); });
      wrapper.append(action, favorite);
      if (card.custom) {
        wrapper.classList.add('personal-card');
        const edit = document.createElement('button');
        edit.type = 'button';
        edit.className = 'card-edit';
        edit.setAttribute('aria-label', 'Editar cartão: ' + card.label);
        edit.append(icon('write'), textElement('span', '', 'Editar'));
        edit.addEventListener('click', function () { openCardEditor(card, edit); });
        wrapper.appendChild(edit);
      }
      fragment.appendChild(wrapper);
    });
    replaceContents(container, fragment);
    $('results-summary').textContent = cards.length + (cards.length === 1 ? ' cartão para se expressar' : ' cartões para se expressar');
    $('cards-empty').hidden = cards.length !== 0;
    $('cards-empty-message').textContent = state.category === 'favorites' && !state.query ? 'Toque no coração de um cartão para guardar seus favoritos.' : state.category === 'personal' && !state.query ? 'Toque em “Criar cartão” para guardar suas próprias palavras.' : 'Tente outra palavra ou categoria.';
  }

  function showCardError(message, field) {
    $('custom-card-error').textContent = message;
    $('custom-card-error').hidden = !message;
    ['custom-card-label', 'custom-card-phrase'].forEach(function (id) { $(id).removeAttribute('aria-invalid'); });
    if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
  }

  function renderEmojiPalette() {
    const fragment = document.createDocumentFragment();
    emojiPalette.forEach(function (emoji) {
      const choice = document.createElement('button');
      choice.type = 'button';
      choice.className = 'emoji-choice';
      choice.textContent = emoji;
      choice.setAttribute('aria-label', 'Imagem: ' + emoji);
      choice.setAttribute('aria-pressed', String(emoji === editorEmoji));
      choice.addEventListener('click', function () {
        editorEmoji = emoji;
        $('custom-card-emoji-preview').textContent = emoji;
        $('custom-card-emojis').querySelectorAll('button').forEach(function (button) { button.setAttribute('aria-pressed', String(button.textContent === emoji)); });
      });
      fragment.appendChild(choice);
    });
    replaceContents($('custom-card-emojis'), fragment);
    $('custom-card-emoji-preview').textContent = editorEmoji;
  }

  function editorHasChanges() {
    return editorInitial && ($('custom-card-label').value !== editorInitial.label || $('custom-card-phrase').value !== editorInitial.phrase || editorEmoji !== editorInitial.emoji);
  }

  function openCardEditor(card, returnTarget) {
    const requestedId = card ? card.id : null;
    if (!$('custom-card-editor').hidden && requestedId !== editingCardId && editorHasChanges()) {
      toast('Salve ou cancele o cartão aberto antes de editar outro.');
      $('custom-card-label').focus();
      return;
    }
    if (!card && state.customCards.length >= customLimit) {
      toast('Você tem 200 cartões pessoais. Edite ou exclua um para criar outro.');
      return;
    }
    if (!$('custom-card-editor').hidden && requestedId === editingCardId) {
      $('custom-card-label').focus();
      return;
    }
    editingCardId = requestedId;
    editorReturnTarget = returnTarget || $('new-card');
    editorEmoji = card ? card.emoji : '💬';
    $('custom-card-label').value = card ? card.label : '';
    $('custom-card-phrase').value = card ? card.phrase : '';
    editorInitial = { label: $('custom-card-label').value, phrase: $('custom-card-phrase').value, emoji: editorEmoji };
    $('custom-card-editor-title').textContent = card ? 'Editar meu cartão' : 'Criar cartão';
    $('custom-card-count').textContent = state.customCards.length + ' / ' + customLimit + ' pessoais';
    $('delete-custom-card').hidden = !card;
    $('custom-card-delete-confirmation').hidden = true;
    showCardError('');
    renderEmojiPalette();
    $('custom-card-editor').hidden = false;
    $('custom-card-label').focus();
  }

  function closeCardEditor() {
    $('custom-card-editor').hidden = true;
    $('custom-card-delete-confirmation').hidden = true;
    editingCardId = null;
    editorInitial = null;
    showCardError('');
    const target = editorReturnTarget && document.documentElement.contains(editorReturnTarget) ? editorReturnTarget : $('new-card');
    target.focus();
    editorReturnTarget = null;
  }

  function saveCustomCard(event) {
    event.preventDefault();
    const label = $('custom-card-label').value.trim();
    const phrase = $('custom-card-phrase').value.trim();
    if (!label || label.length > 50) { showCardError('Escreva um nome de até 50 caracteres.', $('custom-card-label')); return; }
    if (!phrase || phrase.length > 500) { showCardError('Escreva uma frase de até 500 caracteres.', $('custom-card-phrase')); return; }
    if (emojiPalette.indexOf(editorEmoji) === -1) { showCardError('Escolha uma imagem da lista.'); return; }
    const nameKey = catalog.normalize(label) || label.toLocaleLowerCase('pt-BR');
    if (state.customCards.some(function (card) {
      const previousKey = catalog.normalize(card.label) || card.label.toLocaleLowerCase('pt-BR');
      return card.id !== editingCardId && previousKey === nameKey;
    })) {
      showCardError('Você já tem um cartão pessoal com esse nome. Escolha outro nome.', $('custom-card-label'));
      return;
    }
    if (!editingCardId && state.customCards.length >= customLimit) { showCardError('O limite é de 200 cartões pessoais. Exclua um para continuar.'); return; }
    let id = editingCardId;
    if (!id) {
      do { id = 'custom-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10); }
      while (state.customCards.some(function (card) { return card.id === id; }));
    }
    const card = { id: id, category: 'personal', emoji: editorEmoji, label: label, phrase: phrase, keywords: [label], supportLabel: label, color: 'mint', custom: true };
    const next = editingCardId ? state.customCards.map(function (previous) { return previous.id === id ? card : previous; }) : state.customCards.concat(card);
    if (!persist(storageKeys.cards, next)) return;
    const wasEditing = !!editingCardId;
    state.customCards = next;
    state.category = 'personal';
    state.query = '';
    $('card-search').value = '';
    if (state.selectedCardId === id) { stopSpeaking(); state.selectedPhrase = phrase; $('selected-phrase').textContent = phrase; }
    renderCategories();
    renderCards();
    renderImageOutput();
    closeCardEditor();
    toast(wasEditing ? 'Cartão atualizado neste aparelho.' : 'Cartão criado neste aparelho.');
  }

  function deleteCustomCard() {
    const id = editingCardId;
    if (!id || !state.customCards.some(function (card) { return card.id === id; })) return;
    const next = state.customCards.filter(function (card) { return card.id !== id; });
    if (!persist(storageKeys.cards, next)) return;
    state.customCards = next;
    const nextFavorites = state.favorites.filter(function (favoriteId) { return favoriteId !== id; });
    const favoritesSaved = nextFavorites.length === state.favorites.length || persist(storageKeys.favorites, nextFavorites);
    state.favorites = nextFavorites;
    if (state.selectedCardId === id) {
      stopSpeaking();
      state.selectedCardId = '';
      state.selectedPhrase = '';
      $('selected-phrase').textContent = 'Escolha um cartão para começar.';
      $('repeat-phrase').disabled = true;
      $('phrase-bar').hidden = true;
    }
    renderCards();
    renderImageOutput();
    closeCardEditor();
    toast(favoritesSaved ? 'Cartão pessoal excluído.' : 'Cartão excluído. Não foi possível atualizar os favoritos salvos.');
  }

  function updateCapabilities(payload) {
    if (!payload || typeof payload !== 'object') return;
    ['ttsReady', 'recognizerReady'].forEach(function (key) {
      if (typeof payload[key] === 'boolean') state.capabilities[key] = payload[key];
    });
    ['ttsMessage', 'recognizerMessage'].forEach(function (key) {
      if (typeof payload[key] === 'string') state.capabilities[key] = payload[key];
    });
    state.capabilities.native = native;
    $('voice-notice').textContent = state.capabilities.ttsReady ? '' : state.capabilities.ttsMessage;
    $('recognizer-notice').textContent = state.capabilities.recognizerReady ? '' : state.capabilities.recognizerMessage;
  }

  function loadBrowserVoice() {
    if (native) return;
    const synthesis = window.speechSynthesis;
    const voices = synthesis ? synthesis.getVoices() : [];
    browserVoice = voices.filter(function (voice) { return voice.localService === true && /^pt(?:-|_)/i.test(voice.lang); }).sort(function (a, b) {
      return Number(/^pt[-_]br$/i.test(b.lang)) - Number(/^pt[-_]br$/i.test(a.lang));
    })[0] || null;
    updateCapabilities({ ttsReady: !!browserVoice, ttsMessage: 'Para falar sem internet, instale uma voz em português nas configurações de texto para fala do aparelho ou use o aplicativo Android.' });
  }

  function setSpeaking(active) {
    state.speaking = !!active;
    $('stop-speech').disabled = !state.speaking;
    $('stop-message-speech').hidden = !state.speaking;
  }

  function stopSpeaking() {
    if (native) callNative('stopSpeaking');
    else if (window.speechSynthesis) window.speechSynthesis.cancel();
    utterance = null;
    setSpeaking(false);
  }

  function speak(text) {
    const phrase = String(text || '').trim().slice(0, 1000);
    if (!phrase) return;
    state.selectedPhrase = phrase;
    $('phrase-bar').hidden = false;
    $('selected-phrase').textContent = phrase;
    $('repeat-phrase').disabled = false;
    if (!state.capabilities.ttsReady) {
      toast(state.capabilities.ttsMessage || 'Uma voz offline em português precisa estar instalada neste aparelho.');
      return;
    }
    if (state.listening || state.listenPending) stopListening();
    if (native) {
      callNative('speak', phrase);
      return;
    }
    if (!browserVoice || !window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      toast('Não há uma voz offline em português disponível neste navegador. Use o aplicativo Android.');
      return;
    }
    window.speechSynthesis.cancel();
    utterance = new window.SpeechSynthesisUtterance(phrase);
    utterance.voice = browserVoice;
    utterance.lang = browserVoice.lang;
    utterance.rate = 0.9;
    utterance.onstart = function () { setSpeaking(true); };
    utterance.onend = function () { setSpeaking(false); utterance = null; };
    utterance.onerror = function (event) {
      setSpeaking(false);
      if (event.error !== 'interrupted' && event.error !== 'canceled') toast('Não foi possível falar. Verifique a voz offline e o volume do aparelho.');
    };
    window.speechSynthesis.speak(utterance);
  }

  function renderComposer() {
    const value = $('message-input').value;
    const hasText = !!value.trim();
    $('character-count').textContent = value.length.toLocaleString('pt-BR') + ' / 1.000';
    $('speak-message').disabled = !hasText;
    $('save-message').disabled = !hasText;
    $('clear-message').disabled = !value;
  }

  function saveMessage() {
    const phrase = $('message-input').value.trim().slice(0, 1000);
    if (!phrase) return;
    if (state.savedPhrases.indexOf(phrase) !== -1) { toast('Essa frase já está salva.'); return; }
    if (state.savedPhrases.length >= 30) { toast('Você já tem 30 frases salvas. Remova uma para guardar outra.'); return; }
    const next = state.savedPhrases.concat(phrase);
    if (!persist(storageKeys.phrases, next)) return;
    state.savedPhrases = next;
    renderSavedPhrases();
    toast('Frase salva neste aparelho.');
  }

  function renderSavedPhrases() {
    const container = $('saved-phrases');
    const fragment = document.createDocumentFragment();
    state.savedPhrases.forEach(function (phrase, index) {
      const row = textElement('div', 'saved-phrase');
      const action = document.createElement('button');
      action.type = 'button';
      action.className = 'saved-speak';
      action.setAttribute('aria-label', 'Falar frase salva: ' + phrase);
      action.append(icon('volume'), textElement('span', '', phrase));
      action.addEventListener('click', function () { speak(phrase); });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'button-icon saved-remove';
      remove.setAttribute('aria-label', 'Remover frase salva: ' + phrase);
      remove.appendChild(icon('close'));
      remove.addEventListener('click', function () {
        const next = state.savedPhrases.filter(function (_, i) { return i !== index; });
        if (!persist(storageKeys.phrases, next)) return;
        state.savedPhrases = next;
        renderSavedPhrases();
        toast('Frase removida.');
      });
      row.append(action, remove);
      fragment.appendChild(row);
    });
    replaceContents(container, fragment);
    $('saved-empty').hidden = state.savedPhrases.length !== 0;
    $('saved-count').textContent = state.savedPhrases.length + (state.savedPhrases.length === 1 ? ' salva' : ' salvas');
  }

  function renderListening() {
    $('listen-toggle').setAttribute('aria-pressed', String(state.listening));
    $('listen-toggle').disabled = state.listenPending || (state.processing && !state.listening);
    $('listen-title').textContent = state.listening ? 'Estou ouvindo.' : state.processing ? 'Preparando o texto.' : 'Vamos ouvir?';
    $('listen-status').textContent = state.listening ? 'Peça para a pessoa falar perto do celular. Toque no botão para terminar.' : state.processing ? 'O microfone parou. O aparelho está processando a fala. Aguarde o texto.' : 'Toque no microfone e aproxime o celular de quem está falando.';
    $('listen-button-label').textContent = state.listenPending ? 'Abrindo o microfone…' : state.listening ? 'Parar de ouvir' : state.processing ? 'Processando fala no aparelho…' : 'Começar a ouvir';
    $('recording-badge').hidden = !state.listening;
    $('clear-transcript').disabled = state.listening || state.listenPending || !state.displayTranscript;
  }

  function stopListening() {
    if (native) callNative('stopListening');
    state.listening = false;
    state.listenPending = false;
    renderListening();
    // The native listener emits its final text before listening:false.
  }

  function toggleListening() {
    if (state.listening || state.listenPending) { stopListening(); return; }
    if (state.processing) { toast('Aguarde a transcrição atual terminar para ouvir outra conversa.'); return; }
    if (!native || !state.capabilities.recognizerReady) {
      toast(state.capabilities.recognizerMessage || 'O reconhecimento de voz offline não está disponível neste aparelho.');
      return;
    }
    stopSpeaking();
    state.ignoreTranscriptUntilNextStart = false;
    state.listenPending = true;
    renderListening();
    callNative('startListening');
  }

  function renderImageOutput() {
    const matches = catalog.matchCards(state.displayTranscript, 8, state.customCards);
    const container = $('image-matches');
    const fragment = document.createDocumentFragment();
    matches.forEach(function (card) {
      const item = textElement('div', 'image-match color-' + card.color);
      const emoji = textElement('span', '', card.emoji);
      emoji.setAttribute('aria-hidden', 'true');
      item.append(emoji, textElement('span', '', card.supportLabel));
      fragment.appendChild(item);
    });
    replaceContents(container, fragment);
    $('image-empty').hidden = matches.length !== 0;
    $('image-empty').querySelector('p').textContent = state.displayTranscript ? 'Ainda não há imagens de apoio para estas palavras.' : 'As imagens de apoio vão aparecer aqui.';
  }

  function renderLibras() {
    const container = $('libras-videos');
    const supplied = Array.isArray(window.LIBRAS_CATALOG) ? window.LIBRAS_CATALOG : catalog.libras;
    const fullText = catalog.normalize(state.displayTranscript);
    const matches = fullText ? supplied.filter(function (entry) {
      // Only exact phrases with a reviewed, packaged local video are eligible.
      return entry && entry.reviewed === true && typeof entry.phrase === 'string' && catalog.normalize(entry.phrase) === fullText && typeof entry.video === 'string' && /^libras\/[a-zA-Z0-9_\-/]+\.mp4$/.test(entry.video);
    }) : [];
    const fragment = document.createDocumentFragment();
    matches.forEach(function (entry) {
      const item = textElement('div', 'libras-video-entry');
      const video = document.createElement('video');
      video.src = entry.video;
      video.controls = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.setAttribute('aria-label', 'Tradução em Libras: ' + entry.phrase);
      item.append(video, textElement('p', '', entry.phrase));
      fragment.appendChild(item);
    });
    replaceContents(container, fragment);
    $('libras-library-empty').hidden = matches.length !== 0;
  }

  function renderTranscript() {
    const finalText = state.transcript;
    const interim = state.interimTranscript;
    $('transcript-text').textContent = finalText || (interim ? '' : 'A fala vai aparecer aqui, em português.');
    $('transcript-text').classList.toggle('empty-transcript', !finalText && !interim);
    $('transcript-interim').textContent = interim;
    $('clear-transcript').disabled = state.listening || state.listenPending || !state.displayTranscript;
    renderImageOutput();
    if (state.format === 'libras') renderLibras();
  }

  function receiveTranscript(payload) {
    if (state.ignoreTranscriptUntilNextStart) return;
    if (!payload || typeof payload.text !== 'string') return;
    const text = payload.text.slice(0, 30000);
    state.displayTranscript = text;
    // Native sends the entire current conversation, including partial results.
    // Replacing it avoids adding final segments twice.
    if (payload.final || !text) {
      state.transcript = text;
      state.interimTranscript = '';
    } else if (state.transcript && text.indexOf(state.transcript) === 0) {
      state.interimTranscript = text.slice(state.transcript.length);
    } else {
      state.transcript = '';
      state.interimTranscript = text;
    }
    renderTranscript();
  }

  function setFormat(format) {
    if (['images', 'text', 'libras'].indexOf(format) === -1) return;
    state.format = format;
    document.querySelectorAll('[data-format]').forEach(function (button) {
      const active = button.dataset.format === format;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    $('image-output').hidden = format !== 'images';
    $('libras-output').hidden = format !== 'libras';
    if (format === 'libras') renderLibras();
  }

  function switchTab(tab, updateHash) {
    if (!Object.prototype.hasOwnProperty.call(routes, tab)) return;
    if (state.tab === 'listen' && tab !== 'listen' && (state.listening || state.listenPending)) stopListening();
    state.tab = tab;
    document.querySelectorAll('[data-tab]').forEach(function (button) {
      const active = button.dataset.tab === tab;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });
    Object.keys(routes).forEach(function (key) { $('panel-' + key).hidden = key !== tab; });
    if (updateHash) {
      try { window.history.replaceState(null, '', '#' + routes[tab]); } catch (_) { /* file origins may reject replaceState */ }
    }
  }

  function tabFromHash() {
    const name = window.location.hash.slice(1);
    return Object.keys(routes).find(function (key) { return routes[key] === name; }) || 'communicate';
  }

  function onNativeEvent(type, payload) {
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch (_) { return; }
    }
    payload = payload || {};
    if (type === 'capabilities') updateCapabilities(payload);
    else if (type === 'transcript') receiveTranscript(payload);
    else if (type === 'listening') {
      state.listening = !!payload.active;
      state.listenPending = false;
      renderListening();
    } else if (type === 'processing') {
      state.processing = !!payload.active;
      renderListening();
    } else if (type === 'speaking') setSpeaking(payload.active);
    else if (type === 'error') {
      state.listenPending = false;
      renderListening();
      toast(typeof payload.message === 'string' ? payload.message : 'Não foi possível concluir. Tente novamente.');
    }
  }

  window.App = {
    onNativeEvent: onNativeEvent,
    getState: function () { return JSON.parse(JSON.stringify(state)); }
  };

  document.querySelectorAll('[data-tab]').forEach(function (button) {
    button.addEventListener('click', function () { switchTab(button.dataset.tab, true); });
    button.addEventListener('keydown', function (event) {
      const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
      if (keys.indexOf(event.key) === -1) return;
      event.preventDefault();
      const tabs = Array.from(document.querySelectorAll('[data-tab]'));
      const current = tabs.indexOf(button);
      let next = event.key === 'ArrowLeft' ? (current + tabs.length - 1) % tabs.length : (current + 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      switchTab(tabs[next].dataset.tab, true);
      tabs[next].focus();
    });
  });
  window.addEventListener('hashchange', function () { switchTab(tabFromHash(), false); });
  $('card-search').addEventListener('input', function (event) { state.query = event.target.value; renderCards(); });
  $('new-card').addEventListener('click', function () { openCardEditor(null, $('new-card')); });
  $('custom-card-form').addEventListener('submit', saveCustomCard);
  $('cancel-custom-card').addEventListener('click', closeCardEditor);
  $('custom-card-editor').addEventListener('keydown', function (event) {
    if (event.key === 'Escape') { event.preventDefault(); closeCardEditor(); }
  });
  $('delete-custom-card').addEventListener('click', function () {
    $('custom-card-delete-confirmation').hidden = false;
    $('confirm-delete-custom-card').focus();
  });
  $('confirm-delete-custom-card').addEventListener('click', deleteCustomCard);
  $('cancel-delete-custom-card').addEventListener('click', function () {
    $('custom-card-delete-confirmation').hidden = true;
    $('delete-custom-card').focus();
  });
  $('reset-search').addEventListener('click', function () {
    state.query = '';
    state.category = 'all';
    $('card-search').value = '';
    renderCategories();
    renderCards();
  });
  $('repeat-phrase').addEventListener('click', function () { speak(state.selectedPhrase); });
  $('stop-speech').addEventListener('click', stopSpeaking);
  $('stop-message-speech').addEventListener('click', stopSpeaking);
  $('message-input').addEventListener('input', renderComposer);
  $('speak-message').addEventListener('click', function () { speak($('message-input').value); });
  $('save-message').addEventListener('click', saveMessage);
  $('clear-message').addEventListener('click', function () { $('message-input').value = ''; renderComposer(); $('message-input').focus(); });
  $('listen-toggle').addEventListener('click', toggleListening);
  $('clear-transcript').addEventListener('click', function () {
    if (state.listening || state.listenPending) return;
    state.ignoreTranscriptUntilNextStart = true;
    state.transcript = '';
    state.interimTranscript = '';
    state.displayTranscript = '';
    renderTranscript();
    toast('Conversa apagada deste aparelho.');
  });
  document.querySelectorAll('[data-format]').forEach(function (button) { button.addEventListener('click', function () { setFormat(button.dataset.format); }); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (state.listening || state.listenPending) stopListening();
      stopSpeaking();
    }
  });

  renderCategories();
  renderCards();
  renderComposer();
  renderSavedPhrases();
  renderListening();
  renderTranscript();
  updateCapabilities(state.capabilities);
  switchTab(tabFromHash(), false);
  if (native) {
    const raw = callNative('getCapabilities');
    if (typeof raw === 'string') {
      try { updateCapabilities(JSON.parse(raw)); } catch (_) { /* readiness will arrive through an event */ }
    }
  } else {
    loadBrowserVoice();
    if (window.speechSynthesis) window.speechSynthesis.addEventListener('voiceschanged', loadBrowserVoice);
  }
})();

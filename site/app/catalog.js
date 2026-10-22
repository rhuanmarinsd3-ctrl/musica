(function (root) {
  'use strict';

  const categories = [
    { id: 'all', label: 'Todos', icon: '✦' },
    { id: 'needs', label: 'Preciso de…', icon: '🙌' },
    { id: 'emotions', label: 'Sinto que…', icon: '😊' },
    { id: 'conversation', label: 'Conversar', icon: '💬' },
    { id: 'health', label: 'Meu corpo', icon: '🩹' },
    { id: 'favorites', label: 'Favoritos', icon: '♡' }
  ];

  const supportLabels = {
    food: 'Comida', water: 'Água', happy: 'Alegria', help: 'Ajuda', bathroom: 'Banheiro', sad: 'Tristeza', thanks: 'Agradecimento', rest: 'Descanso', pain: 'Dor', love: 'Carinho', yes: 'Sim', no: 'Não', fear: 'Medo', angry: 'Raiva', tired: 'Cansaço', calm: 'Tranquilidade', anxious: 'Ansiedade', surprise: 'Surpresa', confused: 'Explicação', hug: 'Abraço', home: 'Casa', outside: 'Passeio', quiet: 'Som e silêncio', space: 'Espaço pessoal', hello: 'Cumprimento', please: 'Gentileza', repeat: 'Repetição', slowly: 'Velocidade', write: 'Escrita', wait: 'Espera', talk: 'Conversa', bye: 'Despedida', cold: 'Frio', hot: 'Calor', sick: 'Mal-estar', doctor: 'Atendimento médico', medicine: 'Remédio', headache: 'Cabeça', stomach: 'Barriga', dizzy: 'Tontura', proud: 'Orgulho', lonely: 'Companhia', excited: 'Animação', uncomfortable: 'Desconforto', phone: 'Telefone', family: 'Família', charge: 'Bateria', accessible: 'Comunicação'
  };

  const cards = [
    ['food', 'needs', '🍽️', 'Quero comer', 'Eu quero comida, por gentileza.', ['comida', 'comer', 'fome', 'almoco', 'jantar', 'cafe da manha'], 'peach'],
    ['water', 'needs', '💧', 'Quero água', 'Eu quero água, por gentileza.', ['agua', 'sede', 'beber'], 'blue'],
    ['happy', 'emotions', '😊', 'Estou feliz', 'Eu estou feliz.', ['feliz', 'felizes', 'felicidade', 'alegria', 'alegre'], 'yellow'],
    ['help', 'needs', '🙋', 'Preciso de ajuda', 'Eu preciso de ajuda, por gentileza.', ['ajuda', 'ajudar', 'socorro'], 'mint'],
    ['bathroom', 'needs', '🚻', 'Ir ao banheiro', 'Eu preciso ir ao banheiro, por gentileza.', ['banheiro', 'toalete'], 'lilac'],
    ['sad', 'emotions', '😢', 'Estou triste', 'Eu estou triste. Você pode ficar comigo?', ['triste', 'tristeza', 'chorar', 'chorando'], 'blue'],
    ['thanks', 'conversation', '💛', 'Agradecer', 'Eu agradeço pela sua ajuda.', ['obrigado', 'obrigada', 'agradeco', 'agradecer'], 'yellow'],
    ['rest', 'needs', '🛏️', 'Quero descansar', 'Eu preciso descansar um pouco.', ['descansar', 'descanso', 'dormir', 'sono'], 'lilac'],
    ['pain', 'health', '🤕', 'Estou com dor', 'Eu estou com dor. Preciso de ajuda.', ['dor', 'doendo', 'machucado', 'machucada'], 'peach'],
    ['love', 'emotions', '🥰', 'Sinto carinho', 'Eu sinto muito carinho por você.', ['carinho', 'amor', 'amo', 'amar'], 'pink'],
    ['yes', 'conversation', '👍', 'Sim', 'Sim.', ['sim', 'concordo', 'certo'], 'mint'],
    ['no', 'conversation', '✋', 'Não', 'Não.', ['nao', 'discordo'], 'peach'],
    ['fear', 'emotions', '😨', 'Estou com medo', 'Eu estou com medo. Fique comigo, por gentileza.', ['medo', 'assustado', 'assustada'], 'lilac'],
    ['angry', 'emotions', '😠', 'Estou com raiva', 'Eu estou com raiva e preciso de um tempo.', ['raiva', 'bravo', 'brava', 'irritado', 'irritada'], 'pink'],
    ['tired', 'emotions', '😴', 'Estou cansado(a)', 'Eu estou com cansaço. Preciso de uma pausa.', ['cansado', 'cansada', 'cansaco', 'exausto', 'exausta'], 'blue'],
    ['calm', 'emotions', '😌', 'Estou tranquilo(a)', 'Eu estou me sentindo bem e com tranquilidade.', ['calmo', 'calma', 'tranquilo', 'tranquila', 'tranquilidade'], 'mint'],
    ['anxious', 'emotions', '😟', 'Estou ansioso(a)', 'Eu estou com ansiedade. Preciso de um lugar tranquilo.', ['ansioso', 'ansiosa', 'ansiedade', 'nervoso', 'nervosa'], 'yellow'],
    ['surprise', 'emotions', '😮', 'Que surpresa!', 'Eu estou sentindo surpresa!', ['surpresa', 'surpreso', 'surpresa'], 'peach'],
    ['confused', 'emotions', '😕', 'Não entendi', 'Eu não entendi. Você pode explicar de outro jeito?', ['entendi', 'entender', 'confuso', 'confusa', 'explicar'], 'lilac'],
    ['hug', 'needs', '🫂', 'Quero um abraço', 'Você pode me dar um abraço?', ['abraco', 'abracar'], 'pink'],
    ['home', 'needs', '🏡', 'Quero ir para casa', 'Eu quero ir para casa, por gentileza.', ['casa', 'lar'], 'mint'],
    ['outside', 'needs', '🌳', 'Quero sair', 'Eu quero sair um pouco, por gentileza.', ['sair', 'passear', 'passeio', 'parque'], 'mint'],
    ['quiet', 'needs', '🤫', 'Preciso de silêncio', 'Eu preciso de um lugar mais silencioso, por gentileza.', ['silencio', 'silencioso', 'barulho', 'alto'], 'blue'],
    ['space', 'needs', '🧘', 'Preciso de espaço', 'Eu preciso de um pouco de espaço e de tempo.', ['espaco', 'sozinho', 'sozinha', 'pausa'], 'lilac'],
    ['hello', 'conversation', '👋', 'Olá!', 'Olá! Como você está?', ['ola', 'oi', 'bom dia', 'boa tarde', 'boa noite'], 'yellow'],
    ['please', 'conversation', '🙏', 'Por gentileza', 'Por gentileza.', ['gentileza', 'por favor'], 'peach'],
    ['repeat', 'conversation', '🔁', 'Pode repetir?', 'Você pode repetir, por gentileza?', ['repetir', 'repita', 'novamente'], 'blue'],
    ['slowly', 'conversation', '🐢', 'Mais devagar', 'Você pode falar mais devagar, por gentileza?', ['devagar', 'rapido', 'rapida'], 'mint'],
    ['write', 'conversation', '✍️', 'Pode escrever?', 'Você pode escrever o que está dizendo, por gentileza?', ['escrever', 'escreva', 'escrito', 'escrita'], 'lilac'],
    ['wait', 'conversation', '⏳', 'Um momento', 'Preciso de um momento, por gentileza.', ['momento', 'esperar', 'espere', 'aguarde'], 'yellow'],
    ['talk', 'conversation', '💬', 'Quero conversar', 'Eu quero conversar com você.', ['conversar', 'conversa', 'falar'], 'pink'],
    ['bye', 'conversation', '🤗', 'Até logo!', 'Até logo! Foi bom conversar com você.', ['tchau', 'ate logo', 'adeus'], 'mint'],
    ['cold', 'health', '🥶', 'Estou com frio', 'Eu estou com frio. Preciso me aquecer.', ['frio', 'gelado', 'gelada'], 'blue'],
    ['hot', 'health', '🥵', 'Estou com calor', 'Eu estou com calor. Preciso me refrescar.', ['calor', 'quente'], 'peach'],
    ['sick', 'health', '🤒', 'Não estou bem', 'Eu não estou me sentindo bem. Preciso de ajuda.', ['doente', 'febre', 'mal estar', 'passando mal'], 'yellow'],
    ['doctor', 'health', '🩺', 'Preciso de atendimento', 'Eu preciso de atendimento médico, por gentileza.', ['medico', 'medica', 'hospital', 'atendimento', 'saude'], 'mint'],
    ['medicine', 'health', '💊', 'Meu remédio', 'Eu preciso do meu remédio, por gentileza.', ['remedio', 'medicamento'], 'lilac'],
    ['headache', 'health', '🤯', 'Dor de cabeça', 'Eu estou com dor de cabeça.', ['dor de cabeca', 'cabeca', 'enxaqueca'], 'pink'],
    ['stomach', 'health', '🫃', 'Dor na barriga', 'Eu estou com dor na barriga.', ['barriga', 'estomago', 'dor abdominal'], 'peach'],
    ['dizzy', 'health', '😵‍💫', 'Estou com tontura', 'Eu estou com tontura e preciso me sentar.', ['tontura', 'tonto', 'tonta', 'vertigem'], 'blue'],
    ['proud', 'emotions', '🤩', 'Sinto orgulho', 'Eu estou sentindo orgulho!', ['orgulho', 'orgulhoso', 'orgulhosa'], 'yellow'],
    ['lonely', 'emotions', '🥺', 'Quero companhia', 'Eu gostaria de ter companhia.', ['companhia', 'solidao'], 'pink'],
    ['excited', 'emotions', '🥳', 'Estou animado(a)', 'Eu estou com muita animação!', ['animado', 'animada', 'animacao', 'comemorar', 'festa'], 'yellow'],
    ['uncomfortable', 'emotions', '😣', 'Estou desconfortável', 'Eu estou sentindo desconforto. Podemos mudar alguma coisa?', ['desconfortavel', 'desconforto', 'incomodado', 'incomodada'], 'lilac'],
    ['phone', 'needs', '📱', 'Quero ligar', 'Eu quero ligar para alguém, por gentileza.', ['ligar', 'telefone', 'telefonar'], 'blue'],
    ['family', 'needs', '🧑‍🤝‍🧑', 'Quero minha família', 'Eu gostaria de falar com alguém da minha família.', ['familia', 'mae', 'pai', 'irmao', 'irma'], 'pink'],
    ['charge', 'needs', '🔋', 'Carregar o celular', 'Eu preciso carregar meu celular, por gentileza.', ['carregar', 'bateria', 'carregador'], 'mint'],
    ['accessible', 'conversation', '🦻', 'Minha comunicação', 'Eu uso este aplicativo para me comunicar. Podemos conversar por aqui?', ['aplicativo', 'comunicar', 'comunicacao', 'acessibilidade'], 'lilac']
  ].map(function (entry) {
    return Object.freeze({ id: entry[0], category: entry[1], emoji: entry[2], label: entry[3], supportLabel: supportLabels[entry[0]], phrase: entry[4], keywords: Object.freeze(entry[5]), color: entry[6] });
  });

  function normalize(text) {
    return String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function searchCards(query, category, favorites) {
    const terms = normalize(query).split(' ').filter(Boolean);
    const favoriteIds = Array.isArray(favorites) ? favorites : [];
    return cards.filter(function (card) {
      if (category === 'favorites' && favoriteIds.indexOf(card.id) === -1) return false;
      if (category && category !== 'all' && category !== 'favorites' && card.category !== category) return false;
      const haystack = normalize(card.label + ' ' + card.phrase + ' ' + card.keywords.join(' '));
      return terms.every(function (term) { return haystack.indexOf(term) !== -1; });
    });
  }

  // These are keyword illustrations, never emotion detection or a translation.
  function matchCards(text, limit) {
    const haystack = ' ' + normalize(text) + ' ';
    return cards.filter(function (card) {
      return card.keywords.some(function (keyword) { return haystack.indexOf(' ' + normalize(keyword) + ' ') !== -1; });
    }).slice(0, typeof limit === 'number' ? limit : 8);
  }

  root.Catalog = Object.freeze({ categories: Object.freeze(categories), cards: Object.freeze(cards), normalize: normalize, searchCards: searchCards, matchCards: matchCards, libras: Object.freeze([]) });
})(typeof window !== 'undefined' ? window : globalThis);

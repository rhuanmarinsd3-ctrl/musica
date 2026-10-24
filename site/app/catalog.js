(function (root) {
  'use strict';

  const categories = [
    { id: 'all', label: 'Todos', icon: '✦' },
    { id: 'needs', label: 'Preciso de…', icon: '🙌' },
    { id: 'emotions', label: 'Sinto que…', icon: '😊' },
    { id: 'conversation', label: 'Conversar', icon: '💬' },
    { id: 'health', label: 'Meu corpo', icon: '🩹' },
    { id: 'personal', label: 'Meus cartões', icon: '✏️' },
    { id: 'favorites', label: 'Favoritos', icon: '♡' }
  ];

  // This is a communication vocabulary: feelings, moods and lived experiences.
  // It is neither a clinical classification nor an exhaustive list of human emotions.
  const emotionGroups = [
    { id: 'pleasant', label: 'Bem-estar e alegria' },
    { id: 'connection', label: 'Vínculos e pertencimento' },
    { id: 'growth', label: 'Confiança e descobertas' },
    { id: 'fear', label: 'Receio e preocupação' },
    { id: 'loss', label: 'Tristeza e perdas' },
    { id: 'limits', label: 'Raiva e limites' },
    { id: 'self', label: 'Como me vejo' },
    { id: 'mixed', label: 'Sentimentos misturados' }
  ];
  const emojiPalette = ['😊', '😢', '😠', '😨', '😌', '😮', '😕', '🥰', '🤗', '💛', '💬', '👍', '✋', '🙋', '🙏', '🍽️', '💧', '🏡', '🛏️', '🚻', '🌳', '📱', '🩺', '⭐'];
  const originalEmotionGroups = {
    happy: 'pleasant', sad: 'loss', love: 'connection', fear: 'fear', angry: 'limits',
    tired: 'self', calm: 'pleasant', anxious: 'fear', surprise: 'mixed', confused: 'mixed',
    proud: 'growth', lonely: 'connection', excited: 'pleasant', uncomfortable: 'limits'
  };

  const additionalEmotions = [
    ['relief', 'emotions', '😮‍💨', 'Sinto alívio', 'Eu sinto alívio porque uma preocupação passou.', ['alivio', 'aliviado', 'aliviada'], 'mint', 'Alívio', 'pleasant'],
    ['hope', 'emotions', '🌱', 'Tenho esperança', 'Eu tenho esperança de que as coisas podem melhorar.', ['esperanca', 'esperancoso', 'esperancosa'], 'mint', 'Esperança', 'growth'],
    ['confident', 'emotions', '💪', 'Confio em mim', 'Eu confio na minha capacidade de tentar.', ['confianca', 'confiante'], 'yellow', 'Confiança em si', 'growth'],
    ['safe', 'emotions', '🛡️', 'Sinto segurança', 'Eu estou me sentindo em segurança aqui.', ['seguranca', 'seguro', 'segura'], 'mint', 'Segurança', 'pleasant'],
    ['gratitude-feeling', 'emotions', '🙏', 'Sinto gratidão', 'Eu sinto gratidão pelo que recebi.', ['gratidao', 'grato', 'grata'], 'yellow', 'Gratidão', 'connection'],
    ['satisfied', 'emotions', '🙂', 'Sinto satisfação', 'Eu estou satisfeito com o resultado.', ['satisfacao', 'satisfeito', 'satisfeita'], 'yellow', 'Satisfação', 'pleasant'],
    ['fulfilled', 'emotions', '🏅', 'Sinto realização', 'Eu consegui algo importante para mim e estou feliz com isso.', ['realizacao', 'realizado', 'realizada', 'conquista'], 'yellow', 'Realização', 'growth'],
    ['motivated', 'emotions', '🚀', 'Tenho motivação', 'Eu estou com vontade de começar e continuar.', ['motivacao', 'motivado', 'motivada'], 'yellow', 'Motivação', 'growth'],
    ['inspired', 'emotions', '💡', 'Sinto inspiração', 'Essa ideia me inspira a criar alguma coisa.', ['inspiracao', 'inspirado', 'inspirada'], 'lilac', 'Inspiração', 'growth'],
    ['curious', 'emotions', '🔎', 'Tenho curiosidade', 'Eu tenho curiosidade e quero descobrir mais.', ['curiosidade', 'curioso', 'curiosa'], 'mint', 'Curiosidade', 'growth'],
    ['interested', 'emotions', '👀', 'Tenho interesse', 'Isso chamou minha atenção. Quero saber mais.', ['interesse', 'interessado', 'interessada'], 'blue', 'Interesse', 'growth'],
    ['amused', 'emotions', '😄', 'Estou me divertindo', 'Eu estou me divertindo com esse momento.', ['diversao', 'divertido', 'divertida', 'engracado', 'engracada'], 'yellow', 'Diversão', 'pleasant'],
    ['delighted', 'emotions', '🌸', 'Sinto encanto', 'Eu achei isso bonito e estou sentindo encanto.', ['encanto', 'encantado', 'encantada'], 'pink', 'Encanto', 'pleasant'],
    ['admiration', 'emotions', '⭐', 'Sinto admiração', 'Eu admiro o que você fez.', ['admiracao', 'admirar', 'admiro'], 'yellow', 'Admiração', 'connection'],
    ['awe', 'emotions', '🌌', 'Sinto deslumbramento', 'Isso é tão impressionante que eu preciso de um momento para apreciar.', ['deslumbramento', 'deslumbrado', 'deslumbrada', 'impressionante'], 'lilac', 'Deslumbramento', 'pleasant'],
    ['moved', 'emotions', '🥹', 'Isso me comove', 'Eu estou com emoção por dentro. Isso tocou meu coração.', ['comovido', 'comovida', 'comocao'], 'pink', 'Comoção', 'connection'],
    ['tenderness', 'emotions', '🧸', 'Sinto ternura', 'Eu estou sentindo uma vontade suave de cuidar.', ['ternura'], 'pink', 'Ternura', 'connection'],
    ['compassion', 'emotions', '🤲', 'Quero acolher', 'Eu me importo com o seu sofrimento e quero acolher você.', ['compaixao', 'acolher'], 'mint', 'Compaixão', 'connection'],
    ['empathy', 'emotions', '💞', 'Quero compreender você', 'Eu quero compreender como você está se sentindo.', ['empatia', 'compreender'], 'pink', 'Empatia', 'connection'],
    ['belonging', 'emotions', '🧩', 'Sinto que pertenço', 'Eu sinto que faço parte deste grupo.', ['pertencimento', 'pertenco', 'pertencer'], 'mint', 'Pertencimento', 'connection'],
    ['accepted', 'emotions', '🤗', 'Sinto aceitação', 'Eu sinto que posso ser quem sou aqui.', ['aceitacao', 'aceito', 'aceita'], 'mint', 'Aceitação', 'connection'],
    ['welcomed', 'emotions', '🏠', 'Sinto acolhimento', 'Eu estou me sentindo bem recebido neste lugar.', ['acolhimento', 'acolhido', 'acolhida'], 'pink', 'Acolhimento', 'connection'],
    ['connected', 'emotions', '🤝', 'Sinto conexão', 'Eu sinto proximidade com você nesta conversa.', ['conexao', 'conectado', 'conectada', 'proximidade'], 'mint', 'Conexão', 'connection'],
    ['understood', 'emotions', '💬', 'Sinto que me entendem', 'Eu sinto que você entendeu o que eu queria dizer.', ['compreendido', 'compreendida', 'entendido', 'entendida'], 'blue', 'Compreensão recebida', 'connection'],
    ['valued', 'emotions', '💎', 'Sinto meu valor', 'Eu sinto que a minha presença tem valor.', ['valorizado', 'valorizada', 'valorizacao'], 'yellow', 'Valorização', 'connection'],
    ['respected', 'emotions', '🤝', 'Sinto respeito', 'Eu sinto que minhas escolhas estão sendo respeitadas.', ['respeitado', 'respeitada', 'respeito'], 'mint', 'Respeito', 'connection'],
    ['supported', 'emotions', '🤲', 'Sinto apoio', 'Eu sinto que tenho alguém com quem contar.', ['apoiado', 'apoiada', 'apoio'], 'mint', 'Apoio', 'connection'],
    ['trusting', 'emotions', '🔐', 'Confio em você', 'Eu sinto que posso confiar em você.', ['confiar', 'confiavel'], 'blue', 'Confiança no outro', 'connection'],
    ['friendship', 'emotions', '🧑‍🤝‍🧑', 'Sinto amizade', 'Eu sinto amizade e gosto da sua companhia.', ['amizade', 'amigo', 'amiga'], 'yellow', 'Amizade', 'connection'],
    ['romantic', 'emotions', '💕', 'Sinto paixão', 'Eu estou sentindo paixão por uma pessoa.', ['paixao', 'apaixonado', 'apaixonada'], 'pink', 'Paixão', 'connection'],
    ['longing', 'emotions', '💌', 'Sinto saudade', 'Eu sinto saudade de alguém que é importante para mim.', ['saudade', 'saudades'], 'blue', 'Saudade', 'connection'],
    ['nostalgic', 'emotions', '📷', 'Sinto nostalgia', 'Uma lembrança do passado trouxe um sentimento especial.', ['nostalgia', 'nostalgico', 'nostalgica'], 'lilac', 'Nostalgia', 'mixed'],
    ['reconciliation', 'emotions', '🌈', 'Quero recomeçar', 'Eu sinto vontade de me reaproximar e recomeçar nossa relação.', ['reconciliacao', 'reaproximar', 'recomecar'], 'mint', 'Reaproximação', 'connection'],
    ['forgiving', 'emotions', '🕊️', 'Sinto vontade de perdoar', 'Eu estou encontrando espaço para o perdão, no meu tempo.', ['perdao', 'perdoar'], 'mint', 'Perdão', 'connection'],
    ['generous', 'emotions', '🎁', 'Quero compartilhar', 'Eu estou com vontade de compartilhar algo bom.', ['generosidade', 'generoso', 'generosa', 'compartilhar'], 'yellow', 'Generosidade', 'connection'],
    ['joy-for-other', 'emotions', '🎉', 'Fico feliz por você', 'A sua conquista também me deixa feliz.', ['feliz por voce', 'alegria pelo outro'], 'yellow', 'Alegria pelo outro', 'connection'],
    ['courage', 'emotions', '🦁', 'Sinto coragem', 'Mesmo com algum medo, eu quero tentar.', ['coragem', 'corajoso', 'corajosa'], 'peach', 'Coragem', 'growth'],
    ['determined', 'emotions', '🎯', 'Tenho determinação', 'Eu quero continuar buscando o que é importante para mim.', ['determinacao', 'determinado', 'determinada'], 'yellow', 'Determinação', 'growth'],
    ['autonomy', 'emotions', '🧭', 'Sinto autonomia', 'Eu sinto que posso participar das minhas próprias escolhas.', ['autonomia', 'autonomo', 'autonoma'], 'mint', 'Autonomia', 'growth'],
    ['independent', 'emotions', '🚶', 'Sinto independência', 'Eu estou contente por conseguir fazer isso por conta própria.', ['independencia', 'independente'], 'mint', 'Independência', 'growth'],
    ['inner-peace', 'emotions', '🕊️', 'Estou em paz', 'Eu estou em paz com o que aconteceu.', ['paz', 'paz interior'], 'mint', 'Paz interior', 'pleasant'],
    ['self-acceptance', 'emotions', '💚', 'Estou me aceitando', 'Eu estou aprendendo a acolher meu jeito de ser.', ['autoaceitacao', 'aceitar a mim', 'me aceitar'], 'mint', 'Autoaceitação', 'self'],
    ['patient', 'emotions', '⏳', 'Tenho paciência', 'Eu consigo esperar este processo com paciência.', ['paciencia', 'paciente'], 'blue', 'Paciência', 'pleasant'],
    ['optimistic', 'emotions', '☀️', 'Sinto otimismo', 'Eu consigo imaginar um resultado bom.', ['otimismo', 'otimista'], 'yellow', 'Otimismo', 'growth'],
    ['anticipation', 'emotions', '🗓️', 'Sinto expectativa', 'Eu estou pensando no que vai acontecer e esperando por isso.', ['expectativa', 'aguardando'], 'peach', 'Expectativa', 'mixed'],
    ['playful', 'emotions', '🎈', 'Quero brincar', 'Eu estou com vontade de brincar e me divertir.', ['brincar', 'brincadeira'], 'yellow', 'Vontade de brincar', 'pleasant'],
    ['enthusiasm', 'emotions', '🙌', 'Sinto entusiasmo', 'Essa ideia me dá vontade de participar.', ['entusiasmo', 'entusiasmado', 'entusiasmada'], 'yellow', 'Entusiasmo', 'growth'],
    ['fascinated', 'emotions', '🔭', 'Sinto fascínio', 'Eu estou tão interessado que quero continuar observando.', ['fascinio', 'fascinado', 'fascinada'], 'lilac', 'Fascínio', 'growth'],
    ['refreshed', 'emotions', '🌿', 'Sinto renovação', 'Depois desta pausa, eu me sinto com energia para continuar.', ['renovacao', 'renovado', 'renovada'], 'mint', 'Renovação', 'pleasant'],
    ['comfortable', 'emotions', '🛋️', 'Estou à vontade', 'Eu estou me sentindo à vontade aqui.', ['a vontade', 'confortavel', 'conforto'], 'mint', 'Conforto', 'pleasant'],
    ['worried', 'emotions', '😟', 'Estou com preocupação', 'Uma coisa está me preocupando. Você pode conversar comigo?', ['preocupacao', 'preocupado', 'preocupada'], 'yellow', 'Preocupação', 'fear'],
    ['uncertain', 'emotions', '❔', 'Sinto incerteza', 'Eu ainda não sei o que vai acontecer e isso mexe comigo.', ['incerteza', 'incerto', 'incerta'], 'lilac', 'Incerteza', 'fear'],
    ['insecure', 'emotions', '😬', 'Sinto insegurança', 'Eu estou com dúvida sobre a minha capacidade agora.', ['inseguranca', 'inseguro', 'insegura'], 'lilac', 'Insegurança', 'self'],
    ['vulnerable', 'emotions', '🫶', 'Sinto vulnerabilidade', 'Eu estou sensível e preciso que você tenha cuidado comigo.', ['vulnerabilidade', 'vulneravel'], 'pink', 'Vulnerabilidade', 'self'],
    ['apprehensive', 'emotions', '😰', 'Sinto apreensão', 'Eu tenho receio do que pode acontecer em seguida.', ['apreensao', 'apreensivo', 'apreensiva'], 'lilac', 'Apreensão', 'fear'],
    ['restless', 'emotions', '🌀', 'Sinto inquietação', 'Está difícil ficar em sossego agora.', ['inquietacao', 'inquieto', 'inquieta'], 'yellow', 'Inquietação', 'fear'],
    ['tense', 'emotions', '😬', 'Sinto tensão', 'Eu estou tenso e preciso relaxar um pouco.', ['tensao', 'tenso', 'tensa'], 'peach', 'Tensão', 'fear'],
    ['overwhelmed', 'emotions', '🌊', 'Estou com sobrecarga', 'Tem muita coisa acontecendo para mim. Preciso de uma pausa.', ['sobrecarga', 'sobrecarregado', 'sobrecarregada'], 'blue', 'Sobrecarga', 'fear'],
    ['pressured', 'emotions', '⏱️', 'Sinto pressão', 'Eu me sinto pressionado a decidir ou fazer alguma coisa.', ['pressao', 'pressionado', 'pressionada'], 'peach', 'Pressão', 'limits'],
    ['stressed', 'emotions', '😫', 'Sinto estresse', 'Eu estou com estresse e preciso diminuir o ritmo.', ['estresse', 'estressado', 'estressada'], 'peach', 'Estresse', 'fear'],
    ['powerless', 'emotions', '🪢', 'Sinto impotência', 'Eu queria mudar isso, mas sinto que não consigo agora.', ['impotencia', 'impotente'], 'blue', 'Impotência', 'loss'],
    ['unsupported', 'emotions', '🧍', 'Sinto desamparo', 'Eu estou precisando de apoio e não sei com quem contar.', ['desamparo', 'desamparado', 'desamparada'], 'blue', 'Desamparo', 'connection'],
    ['discouraged', 'emotions', '😔', 'Sinto desânimo', 'Está difícil encontrar vontade de continuar esta tarefa.', ['desanimo', 'desanimado', 'desanimada'], 'blue', 'Desânimo', 'loss'],
    ['frustrated', 'emotions', '😤', 'Sinto frustração', 'Eu tentei e não saiu como eu queria. Isso me frustra.', ['frustracao', 'frustrado', 'frustrada'], 'peach', 'Frustração', 'limits'],
    ['disappointed', 'emotions', '😞', 'Sinto decepção', 'Eu esperava outra coisa e estou sentindo decepção.', ['decepcao', 'decepcionado', 'decepcionada'], 'blue', 'Decepção', 'loss'],
    ['disillusioned', 'emotions', '🥀', 'Sinto desilusão', 'Eu deixei de acreditar em algo que era importante para mim.', ['desilusao', 'desiludido', 'desiludida'], 'blue', 'Desilusão', 'loss'],
    ['hopeless', 'emotions', '☁️', 'Está difícil ter esperança', 'Neste momento está difícil imaginar uma melhora. Eu preciso de apoio.', ['desesperanca', 'sem esperanca'], 'blue', 'Desesperança', 'loss'],
    ['despair', 'emotions', '😨', 'Sinto desespero', 'Eu estou em desespero e preciso de ajuda agora.', ['desespero', 'desesperado', 'desesperada'], 'peach', 'Desespero', 'fear'],
    ['grief', 'emotions', '🕯️', 'Estou de luto', 'Eu estou vivendo um luto. Preciso de cuidado e de tempo.', ['luto'], 'blue', 'Luto', 'loss'],
    ['loss-feeling', 'emotions', '🍂', 'Sinto uma perda', 'Algo importante mudou ou foi embora, e eu estou sentindo essa falta.', ['perda', 'sentimento de perda'], 'blue', 'Sentimento de perda', 'loss'],
    ['homesick', 'emotions', '🏡', 'Sinto falta de casa', 'Eu estou com saudade do meu lugar e das pessoas de lá.', ['saudade de casa', 'falta de casa'], 'blue', 'Saudade de casa', 'connection'],
    ['rejected', 'emotions', '💔', 'Sinto rejeição', 'Eu estou sentindo que não sou bem-vindo nesta relação.', ['rejeicao', 'rejeitado', 'rejeitada'], 'pink', 'Rejeição', 'connection'],
    ['excluded', 'emotions', '🚪', 'Sinto exclusão', 'Eu sinto que fiquei de fora e gostaria de participar.', ['exclusao', 'excluido', 'excluida'], 'blue', 'Exclusão', 'connection'],
    ['abandoned', 'emotions', '🧍', 'Sinto abandono', 'Eu sinto que alguém de quem precisava me deixou sem apoio.', ['abandono', 'abandonado', 'abandonada'], 'blue', 'Abandono', 'connection'],
    ['unseen', 'emotions', '👤', 'Sinto que não me veem', 'Eu sinto que minha presença está passando despercebida.', ['invisivel', 'ignorado', 'ignorada'], 'blue', 'Invisibilidade', 'connection'],
    ['forgotten', 'emotions', '🗓️', 'Sinto que esqueceram de mim', 'Eu senti falta de ser lembrado neste momento.', ['esquecido', 'esquecida', 'esqueceram de mim'], 'blue', 'Esquecimento', 'connection'],
    ['misunderstood', 'emotions', '💬', 'Não me sinto compreendido(a)', 'Eu sinto que o que eu quis dizer foi entendido de outro jeito.', ['incompreendido', 'incompreendida', 'incompreensao'], 'lilac', 'Incompreensão', 'connection'],
    ['invalidated', 'emotions', '🤐', 'Meu sentimento precisa de espaço', 'Eu sinto que o que estou sentindo não está sendo levado a sério.', ['invalidado', 'invalidada', 'desvalorizado', 'desvalorizada'], 'pink', 'Desvalorização', 'connection'],
    ['disrespected', 'emotions', '✋', 'Sinto desrespeito', 'Eu sinto que um limite meu não foi respeitado.', ['desrespeito', 'desrespeitado', 'desrespeitada'], 'peach', 'Desrespeito', 'limits'],
    ['humiliated', 'emotions', '😣', 'Sinto humilhação', 'O que aconteceu me fez sentir diminuído. Preciso ser tratado com respeito.', ['humilhacao', 'humilhado', 'humilhada'], 'pink', 'Humilhação', 'self'],
    ['ashamed', 'emotions', '🫣', 'Sinto vergonha', 'Eu estou com vergonha e preciso de um pouco de tempo.', ['vergonha', 'envergonhado', 'envergonhada'], 'pink', 'Vergonha', 'self'],
    ['embarrassed', 'emotions', '😳', 'Sinto constrangimento', 'Esta situação me deixou sem jeito.', ['constrangimento', 'constrangido', 'constrangida', 'sem jeito'], 'pink', 'Constrangimento', 'self'],
    ['guilty', 'emotions', '😔', 'Sinto culpa', 'Eu estou me sentindo responsável por algo que aconteceu.', ['culpa', 'culpado', 'culpada'], 'blue', 'Culpa', 'self'],
    ['regret', 'emotions', '↩️', 'Sinto arrependimento', 'Eu gostaria de ter feito uma escolha diferente.', ['arrependimento', 'arrependido', 'arrependida'], 'blue', 'Arrependimento', 'self'],
    ['remorse', 'emotions', '💔', 'Sinto remorso', 'Eu me sinto mal por ter magoado alguém e quero reparar isso.', ['remorso'], 'blue', 'Remorso', 'connection'],
    ['envy', 'emotions', '😒', 'Sinto inveja', 'Eu estou desejando algo que outra pessoa tem e quero entender esse sentimento.', ['inveja', 'invejoso', 'invejosa'], 'lilac', 'Inveja', 'self'],
    ['jealous', 'emotions', '💚', 'Sinto ciúme', 'Eu estou com ciúme e quero conversar sem controlar você.', ['ciume', 'ciumes', 'ciumento', 'ciumenta'], 'lilac', 'Ciúme', 'connection'],
    ['suspicious', 'emotions', '🤨', 'Sinto desconfiança', 'Eu ainda não me sinto à vontade para confiar nesta situação.', ['desconfianca', 'desconfiado', 'desconfiada'], 'lilac', 'Desconfiança', 'connection'],
    ['betrayed', 'emotions', '💔', 'Sinto uma traição', 'Eu sinto que a confiança que eu tinha foi quebrada.', ['traicao', 'traido', 'traida'], 'pink', 'Confiança quebrada', 'connection'],
    ['resentful', 'emotions', '🪨', 'Sinto ressentimento', 'Uma mágoa ainda está pesando para mim.', ['ressentimento', 'ressentido', 'ressentida', 'magoa'], 'blue', 'Ressentimento', 'limits'],
    ['indignant', 'emotions', '😠', 'Sinto indignação', 'Eu acho o que aconteceu errado e isso me deixa indignado.', ['indignacao', 'indignado', 'indignada'], 'peach', 'Indignação', 'limits'],
    ['injustice', 'emotions', '⚖️', 'Sinto uma injustiça', 'Eu sinto que essa situação não foi justa.', ['injustica', 'injusto', 'injusta'], 'peach', 'Injustiça', 'limits'],
    ['disapproval', 'emotions', '👎', 'Sinto desaprovação', 'Eu não aprovo essa atitude e quero dizer isso com respeito.', ['desaprovacao', 'desaprovo'], 'peach', 'Desaprovação', 'limits'],
    ['disgust', 'emotions', '🤢', 'Sinto nojo', 'Eu senti nojo disso e quero me afastar.', ['nojo'], 'mint', 'Nojo', 'limits'],
    ['aversion', 'emotions', '🚫', 'Sinto aversão', 'Eu tenho uma rejeição forte a isso e prefiro não participar.', ['aversao', 'repulsa'], 'peach', 'Aversão', 'limits'],
    ['bored', 'emotions', '🥱', 'Sinto tédio', 'Eu estou entediado e gostaria de fazer outra coisa.', ['tedio', 'entediado', 'entediada'], 'lilac', 'Tédio', 'self'],
    ['apathetic', 'emotions', '😐', 'Sinto apatia', 'Está difícil me interessar pelas coisas agora.', ['apatia', 'apatico', 'apatica'], 'blue', 'Apatia', 'self'],
    ['empty', 'emotions', '🫙', 'Sinto um vazio', 'Eu estou com uma sensação de vazio e gostaria de companhia.', ['vazio', 'vazia', 'sensacao de vazio'], 'blue', 'Vazio', 'self'],
    ['numb', 'emotions', '😶', 'Está difícil sentir', 'Eu estou tendo dificuldade para perceber o que sinto agora.', ['entorpecido', 'entorpecida', 'dificil sentir'], 'lilac', 'Dificuldade para sentir', 'self'],
    ['melancholy', 'emotions', '🌧️', 'Sinto melancolia', 'Eu estou com uma tristeza quieta, ligada às minhas lembranças.', ['melancolia', 'melancolico', 'melancolica'], 'blue', 'Melancolia', 'loss'],
    ['bitter', 'emotions', '🍋', 'Sinto amargura', 'Algumas decepções ainda deixam um gosto amargo para mim.', ['amargura', 'amargurado', 'amargurada'], 'blue', 'Amargura', 'loss'],
    ['self-disappointment', 'emotions', '🪞', 'Estou decepcionado(a) comigo', 'Eu esperava algo diferente de mim e preciso me tratar com cuidado.', ['decepcao comigo', 'decepcionado comigo', 'decepcionada comigo'], 'blue', 'Decepção consigo', 'self'],
    ['fear-failure', 'emotions', '🎯', 'Tenho receio de falhar', 'Eu tenho medo de não conseguir. Posso tentar com algum apoio?', ['medo de falhar', 'receio de falhar'], 'lilac', 'Receio de falhar', 'fear'],
    ['fear-judgment', 'emotions', '👥', 'Tenho medo de julgamento', 'Eu estou com medo do que vão pensar de mim.', ['medo de julgamento', 'medo de ser julgado', 'medo de ser julgada'], 'lilac', 'Medo de julgamento', 'fear'],
    ['fear-change', 'emotions', '🛤️', 'Mudanças me assustam', 'Essa mudança me dá medo. Preciso saber o que vai acontecer.', ['medo de mudanca', 'mudancas me assustam'], 'lilac', 'Medo de mudança', 'fear'],
    ['fear-separation', 'emotions', '🤝', 'Tenho medo da separação', 'Eu estou com medo de me separar de alguém importante para mim.', ['medo de separacao', 'medo da separacao'], 'lilac', 'Medo de separação', 'fear'],
    ['shock', 'emotions', '😶', 'Estou em choque', 'O que aconteceu foi muito forte. Preciso de um momento.', ['choque', 'chocado', 'chocada'], 'lilac', 'Choque', 'mixed'],
    ['startled', 'emotions', '😲', 'Levei um susto', 'Eu levei um susto e preciso recuperar a calma.', ['susto', 'assustei'], 'peach', 'Susto', 'fear'],
    ['disbelief', 'emotions', '🤯', 'Custa acreditar', 'Eu ainda estou tentando acreditar no que aconteceu.', ['incredulidade', 'incredulo', 'incredula', 'custa acreditar'], 'lilac', 'Incredulidade', 'mixed'],
    ['mixed-feelings', 'emotions', '🎭', 'Sinto coisas misturadas', 'Eu estou sentindo mais de uma coisa ao mesmo tempo.', ['sentimentos misturados', 'emocoes misturadas', 'sentimentos mistos'], 'lilac', 'Sentimentos misturados', 'mixed'],
    ['inner-conflict', 'emotions', '⚖️', 'Sinto conflito por dentro', 'Uma parte de mim quer uma coisa e outra parte quer algo diferente.', ['conflito interno', 'conflito por dentro'], 'lilac', 'Conflito interno', 'mixed'],
    ['ambivalent', 'emotions', '↔️', 'Quero e não quero', 'Eu sinto vontade e resistência em relação à mesma coisa.', ['ambivalencia', 'ambivalente'], 'lilac', 'Ambivalência', 'mixed'],
    ['indecisive', 'emotions', '🧭', 'Sinto indecisão', 'Eu ainda não consegui escolher. Preciso de mais tempo ou informação.', ['indecisao', 'indeciso', 'indecisa'], 'lilac', 'Indecisão', 'mixed'],
    ['yearning', 'emotions', '🌠', 'Sinto um anseio', 'Eu estou desejando muito algo que ainda não aconteceu.', ['anseio', 'anseios'], 'pink', 'Anseio', 'mixed'],
    ['want-change', 'emotions', '🌱', 'Quero uma mudança', 'Eu sinto vontade de mudar alguma coisa na minha vida.', ['vontade de mudanca', 'quero uma mudanca'], 'mint', 'Vontade de mudança', 'growth'],
    ['impatient', 'emotions', '⏱️', 'Sinto impaciência', 'Eu estou com dificuldade de esperar e preciso desacelerar.', ['impaciencia', 'impaciente'], 'peach', 'Impaciência', 'limits'],
    ['irritated', 'emotions', '😒', 'Sinto irritação', 'Pequenas coisas estão me incomodando mais do que de costume.', ['irritacao', 'irritabilidade'], 'peach', 'Irritação', 'limits'],
    ['self-doubt', 'emotions', '🪞', 'Estou duvidando de mim', 'Eu estou duvidando do meu valor e preciso de incentivo.', ['duvida sobre mim', 'duvidando de mim'], 'lilac', 'Dúvida sobre si', 'self'],
    ['self-worth', 'emotions', '💛', 'Reconheço meu valor', 'Eu reconheço que tenho valor, mesmo quando erro.', ['autoestima', 'meu valor', 'reconheco meu valor'], 'yellow', 'Valor próprio', 'self'],
    ['exposed', 'emotions', '🫣', 'Sinto exposição', 'Eu me sinto exposto e prefiro mais privacidade.', ['exposicao', 'exposto', 'exposta'], 'pink', 'Exposição', 'self'],
    ['defensive', 'emotions', '🛡️', 'Estou na defensiva', 'Eu estou sentindo necessidade de me proteger nesta conversa.', ['defensiva', 'defensivo'], 'lilac', 'Defensividade', 'limits'],
    ['offended', 'emotions', '😣', 'Sinto ofensa', 'O que foi dito me ofendeu. Quero explicar por quê.', ['ofensa', 'ofendido', 'ofendida'], 'pink', 'Ofensa', 'limits'],
    ['discomfort-touch', 'emotions', '✋', 'Esse toque me incomoda', 'Eu não estou confortável com esse toque. Pare, por gentileza.', ['toque me incomoda', 'desconforto com toque'], 'peach', 'Desconforto com toque', 'limits'],
    ['reluctant', 'emotions', '🙅', 'Sinto resistência', 'Eu ainda não estou à vontade para fazer isso.', ['relutancia', 'relutante', 'resistencia'], 'peach', 'Resistência', 'mixed'],
    ['resigned', 'emotions', '🍂', 'Sinto resignação', 'Eu estou aceitando algo que não consigo mudar agora, mesmo sendo difícil.', ['resignacao', 'resignado', 'resignada'], 'blue', 'Resignação', 'mixed'],
    ['bittersweet', 'emotions', '🌦️', 'Alegria e tristeza juntas', 'Este momento tem uma parte boa e uma parte triste para mim.', ['agridoce', 'alegria e tristeza'], 'lilac', 'Sentimento agridoce', 'mixed'],
    ['relief-and-guilt', 'emotions', '🌦️', 'Alívio e culpa juntos', 'Eu sinto alívio e culpa ao mesmo tempo. Quero conversar sobre isso.', ['alivio e culpa'], 'lilac', 'Alívio com culpa', 'mixed'],
    ['affection-and-anger', 'emotions', '💞', 'Carinho e raiva juntos', 'Eu gosto de você e também estou com raiva do que aconteceu.', ['carinho e raiva', 'amor e raiva'], 'pink', 'Carinho com raiva', 'mixed'],
    ['pride-and-fear', 'emotions', '🏅', 'Orgulho e medo juntos', 'Eu tenho orgulho do meu passo e também sinto medo do que vem depois.', ['orgulho e medo'], 'lilac', 'Orgulho com medo', 'mixed'],
    ['envy-and-admiration', 'emotions', '⭐', 'Admiração e inveja juntas', 'Eu admiro essa pessoa e também gostaria de ter algo que ela tem.', ['admiracao e inveja'], 'lilac', 'Admiração com inveja', 'mixed'],
    ['excitement-and-fear', 'emotions', '🎢', 'Animação e medo juntos', 'Eu estou com vontade de experimentar e com medo ao mesmo tempo.', ['animacao e medo'], 'lilac', 'Animação com medo', 'mixed'],
    ['anticipatory-sadness', 'emotions', '🍂', 'Sinto tristeza antes da despedida', 'Eu já estou sentindo falta de algo que está perto de terminar.', ['tristeza antes da despedida', 'despedida se aproxima'], 'blue', 'Tristeza antecipada', 'loss'],
    ['emotional-exhaustion', 'emotions', '🔋', 'Minhas emoções me cansaram', 'Eu estou cansado por dentro e preciso de descanso emocional.', ['cansaco emocional', 'exaustao emocional'], 'blue', 'Cansaço emocional', 'self'],
    ['emotional-overflow', 'emotions', '🌊', 'Sinto demais agora', 'Minhas emoções estão muito fortes. Preciso de calma e de apoio.', ['emocoes fortes', 'emocao intensa', 'sinto demais'], 'blue', 'Intensidade emocional', 'self'],
    ['emotional-distance', 'emotions', '🧍', 'Sinto distância entre nós', 'Eu sinto que ficamos distantes e gostaria de entender o que aconteceu.', ['distancia emocional', 'distancia entre nos'], 'blue', 'Distância emocional', 'connection'],
    ['homesafe', 'emotions', '🏡', 'Sinto aconchego', 'Este lugar me traz uma sensação boa de abrigo.', ['aconchego', 'aconchegante'], 'mint', 'Aconchego', 'pleasant'],
    ['lighthearted', 'emotions', '🪁', 'Sinto leveza', 'Por um momento, eu sinto menos peso nas preocupações.', ['leveza', 'leve'], 'mint', 'Leveza', 'pleasant'],
    ['reassured', 'emotions', '🤲', 'Sinto conforto depois do medo', 'O seu apoio me ajudou a me sentir mais seguro.', ['tranquilizado', 'tranquilizada', 'reassegurado', 'reassegurada'], 'mint', 'Conforto recebido', 'connection'],
    ['recognition', 'emotions', '🏅', 'Sinto reconhecimento', 'Eu sinto que meu esforço foi percebido.', ['reconhecimento', 'reconhecido', 'reconhecida'], 'yellow', 'Reconhecimento', 'connection'],
    ['purpose', 'emotions', '🧭', 'Sinto propósito', 'Eu sinto que o que estou fazendo tem sentido para mim.', ['proposito', 'sentido para mim'], 'mint', 'Propósito', 'growth'],
    ['wondering-self', 'emotions', '🪞', 'Estou descobrindo quem sou', 'Eu sinto curiosidade sobre meu próprio jeito de ser.', ['autoconhecimento', 'descobrindo quem sou'], 'lilac', 'Autodescoberta', 'self'],
    ['disoriented', 'emotions', '🧭', 'Sinto falta de direção', 'Eu estou sem saber qual caminho seguir e gostaria de orientação.', ['falta de direcao', 'sem rumo'], 'lilac', 'Falta de direção', 'mixed'],
    ['homesick-for-time', 'emotions', '⏳', 'Sinto falta de outra fase', 'Eu sinto saudade de uma fase da minha vida.', ['saudade de outra fase', 'saudade de uma fase'], 'blue', 'Saudade de uma fase', 'loss'],
    ['fear-missing-out', 'emotions', '👥', 'Tenho receio de ficar de fora', 'Eu estou com medo de perder algo importante enquanto não estou presente.', ['medo de ficar de fora', 'receio de ficar de fora'], 'lilac', 'Receio de ficar de fora', 'fear']
  ];

  const additionalEverydayCards = [
    ['eat-later', 'needs', '⏳', 'Quero comer depois', 'Eu prefiro comer mais tarde, por gentileza.', ['comer depois', 'comer mais tarde'], 'peach', 'Horário de comer'],
    ['snack', 'needs', '🍎', 'Quero um lanche', 'Eu gostaria de um lanche, por gentileza.', ['lanche', 'fruta'], 'peach', 'Lanche'],
    ['sit', 'needs', '🪑', 'Preciso me sentar', 'Eu preciso de um lugar para me sentar, por gentileza.', ['sentar', 'cadeira', 'assento'], 'mint', 'Lugar para sentar'],
    ['lights', 'needs', '💡', 'Ajustar a luz', 'Esta luz está me incomodando. Podemos ajustar a iluminação?', ['luz', 'iluminacao', 'claridade'], 'yellow', 'Iluminação'],
    ['clothes', 'needs', '👕', 'Trocar de roupa', 'Eu preciso trocar de roupa, por gentileza.', ['roupa', 'trocar de roupa'], 'lilac', 'Roupa'],
    ['shower', 'needs', '🚿', 'Quero tomar banho', 'Eu gostaria de tomar banho, por gentileza.', ['banho', 'chuveiro'], 'blue', 'Banho'],
    ['transport', 'needs', '🚌', 'Preciso de transporte', 'Eu preciso de ajuda para chegar ao meu destino.', ['transporte', 'onibus', 'carona'], 'mint', 'Transporte'],
    ['directions', 'needs', '🗺️', 'Preciso de orientação', 'Você pode me mostrar como chegar, por gentileza?', ['orientacao', 'caminho', 'endereco'], 'mint', 'Caminho'],
    ['privacy', 'needs', '🔐', 'Preciso de privacidade', 'Eu preciso de um pouco de privacidade, por gentileza.', ['privacidade', 'particular'], 'lilac', 'Privacidade'],
    ['trusted-person', 'needs', '🤝', 'Quero alguém de confiança', 'Eu gostaria de chamar uma pessoa de minha confiança.', ['pessoa de confianca', 'responsavel', 'acompanhante'], 'pink', 'Pessoa de confiança'],
    ['not-now', 'conversation', '✋', 'Agora não', 'Eu não quero fazer isso agora.', ['agora nao', 'nao agora'], 'peach', 'Outro momento'],
    ['explain-again', 'conversation', '💬', 'Explique de outro jeito', 'Você pode explicar de outro jeito, por gentileza?', ['explicar de outro jeito', 'outra explicacao'], 'blue', 'Outra explicação'],
    ['face-me', 'conversation', '🙂', 'Olhe para mim ao falar', 'Fale de frente para mim, por gentileza.', ['de frente', 'olhe para mim'], 'mint', 'Falar de frente'],
    ['one-at-time', 'conversation', '☝️', 'Uma pessoa por vez', 'Uma pessoa pode falar por vez, por gentileza?', ['uma pessoa por vez', 'um de cada vez'], 'mint', 'Uma pessoa por vez'],
    ['understood-question', 'conversation', '❔', 'Você entendeu?', 'Você entendeu o que eu quis dizer?', ['voce entendeu', 'ficou claro'], 'blue', 'Confirmação'],
    ['show-me', 'conversation', '👀', 'Pode me mostrar?', 'Você pode me mostrar como fazer, por gentileza?', ['mostrar', 'demonstre'], 'yellow', 'Demonstração'],
    ['my-choice', 'conversation', '🧭', 'Quero escolher', 'Eu gostaria de participar dessa escolha.', ['escolher', 'minha escolha', 'decidir'], 'mint', 'Escolha'],
    ['change-mind', 'conversation', '↩️', 'Mudei de ideia', 'Eu mudei de ideia e quero explicar minha escolha.', ['mudei de ideia', 'mudar de ideia'], 'lilac', 'Mudança de ideia'],
    ['vision', 'health', '👓', 'Não estou enxergando bem', 'Eu não estou enxergando bem. Pode me ajudar?', ['enxergar', 'visao', 'oculos'], 'blue', 'Visão'],
    ['hearing', 'health', '🦻', 'Não ouvi o que foi dito', 'Eu não ouvi o que foi dito. Podemos usar texto?', ['nao ouvi', 'audicao', 'ouvir'], 'blue', 'Audição'],
    ['nausea', 'health', '🤢', 'Estou com enjoo', 'Eu estou com enjoo e preciso de uma pausa.', ['enjoo', 'nausea'], 'mint', 'Enjoo'],
    ['breathing', 'health', '🫁', 'Estou com falta de ar', 'Eu estou com dificuldade para respirar e preciso de ajuda agora.', ['falta de ar', 'respirar', 'respiracao'], 'peach', 'Respiração'],
    ['itching', 'health', '🩹', 'Estou com coceira', 'Eu estou com coceira. Preciso de ajuda para entender o que fazer.', ['coceira', 'cocando'], 'lilac', 'Coceira'],
    ['urgent-care', 'health', '🚑', 'Preciso de ajuda urgente', 'Eu preciso de ajuda urgente. Chame atendimento, por gentileza.', ['urgente', 'emergencia', 'ambulancia'], 'peach', 'Atendimento urgente']
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
  ].concat(additionalEmotions, additionalEverydayCards).map(function (entry) {
    return Object.freeze({ id: entry[0], category: entry[1], emoji: entry[2], label: entry[3], supportLabel: supportLabels[entry[0]] || entry[7], phrase: entry[4], keywords: Object.freeze(entry[5]), color: entry[6], emotionGroup: entry[8] || originalEmotionGroups[entry[0]] });
  });

  function normalize(text) {
    return String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function withPersonalCards(customCards) {
    const personal = Array.isArray(customCards) ? customCards.filter(function (card) {
      return card && typeof card.id === 'string' && /^custom-[a-zA-Z0-9-]{1,90}$/.test(card.id)
        && typeof card.label === 'string' && card.label.trim()
        && typeof card.phrase === 'string' && card.phrase.trim();
    }).map(function (card) {
      const label = card.label.trim().slice(0, 50);
      return { id: card.id, category: 'personal', emoji: emojiPalette.indexOf(card.emoji) === -1 ? '💬' : card.emoji,
        label: label, supportLabel: label, phrase: card.phrase.trim().slice(0, 500),
        keywords: Array.isArray(card.keywords) ? card.keywords.filter(function (term) { return typeof term === 'string' && term.trim(); }).map(function (term) { return term.slice(0, 80); }) : [label],
        color: ['mint', 'peach', 'blue', 'pink', 'yellow', 'lilac'].indexOf(card.color) === -1 ? 'mint' : card.color,
        custom: true };
    }).slice(0, 200) : [];
    const seen = Object.create(null);
    return cards.concat(personal).filter(function (card) {
      if (seen[card.id]) return false;
      seen[card.id] = true;
      return true;
    });
  }

  function searchCards(query, category, favorites, customCards) {
    const terms = normalize(query).split(' ').filter(Boolean);
    const favoriteIds = Array.isArray(favorites) ? favorites : [];
    return withPersonalCards(customCards).filter(function (card) {
      if (category === 'favorites' && favoriteIds.indexOf(card.id) === -1) return false;
      if (category && category !== 'all' && category !== 'favorites' && card.category !== category) return false;
      const haystack = normalize(card.label + ' ' + card.phrase + ' ' + card.keywords.join(' '));
      return terms.every(function (term) { return haystack.indexOf(term) !== -1; });
    });
  }

  // These are keyword illustrations, never emotion detection or a translation.
  function matchCards(text, limit, customCards) {
    const haystack = ' ' + normalize(text) + ' ';
    return withPersonalCards(customCards).filter(function (card) {
      return card.keywords.some(function (keyword) {
        const term = normalize(keyword);
        return !!term && haystack.indexOf(' ' + term + ' ') !== -1;
      });
    }).slice(0, typeof limit === 'number' ? limit : 8);
  }

  root.Catalog = Object.freeze({ categories: Object.freeze(categories), cards: Object.freeze(cards), emotionGroups: Object.freeze(emotionGroups.map(Object.freeze)), emojiPalette: Object.freeze(emojiPalette), normalize: normalize, searchCards: searchCards, matchCards: matchCards, libras: Object.freeze([]) });
})(typeof window !== 'undefined' ? window : globalThis);

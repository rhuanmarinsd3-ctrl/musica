# Validação da entrega 0.2

Preparação em 23 de outubro de 2026. Nome confirmado: Voz e Sinais, para todas as idades. Esta entrega é para testes e não comprova conclusão de todos os requisitos solicitados.

## Android

`assembleBundledDebug`, `assembleBundledDebugAndroidTest`, `lintBundledDebug` e `bundleBundledRelease` concluíram. Android mínimo26/destino36, bibliotecas arm64-v8a e x86_64 com alinhamento16KB. APK com assinatura de desenvolvimento; AAB sem assinatura de produção. `apksigner verify` e `zipalign -c -P16` passaram na compilação preparada.

O APK novo abriu de fato no emulador Google APIs26, usando WebView Chrome69: foram observados216cartões, ponte nativa, modelo WhisperTiny extraído de77.691.713bytes e capacidades recognizerReady/ttsReady verdadeiras. Essa é uma verificação de abertura e inicialização, não um teste de microfone físico, fala audível ou precisão no celular. A primeira imagem AOSP tinha WebView incorreta; essa limitação do emulador foi corrigida com a imagem Google APIs.

A transcrição JNI foi exercitada por instrumentação em desenvolvimento, mas não há resultado final aprovado para as frases e o cancelamento no emulador nesta entrega. Não se anuncia esse teste como concluído. A revisão de ciclo de vida e os checks de segmentação não substituem essa execução nem aparelhos reais.

## Interface

A suíte ampliada teve27testes aprovados, sem falhas ou ignorados, incluindo cartões, favoritos, cartões pessoais persistentes, edição, exclusão, texto, transcrição cumulativa, negações, limpeza de resultados atrasados, compatibilidade sem replaceChildren, proteção de HTML e ausência de reconhecimento em nuvem.

As auditorias automáticas WCAGAA cobrem abas e editor de cartões. Elas não substituem avaliação com pessoas usuárias, TalkBack e fontes ampliadas.

## Precisão de reconhecimento

O modelo incluído é WhisperTiny multilíngue. Em seis frases sintéticas pt-BR pré-definidas, com limiar WER<=0,34 e palavras obrigatórias, somente3/6 passaram e1/6ficou exata. Exemplos reais: “eu quero comida por gentileza” virou “Eu quero comida por gentileira.”; a frase de água ficou “Eu can't wag web.”; “eu não estou triste” ficou “E o galetal triste.”, perdendo a negação.

Esses resultados são falhas relevantes e não foram escondidos nem usados para anunciar boa precisão. São áudios de síntese e não medem toda a fala humana. O modeloBase também foi pesquisado, mas não foi escolhido nem embutido sem validação. O perfil CLI desktop e o perfil JNI Android diferem; não se presume precisão idêntica.

Antes de usar para comunicação importante, confirme a transcrição com a pessoa. Faltam testes representativos com fala humana, sotaques, ruído e dispositivos reais. O app preserva a transcrição inteira e não classifica sentimentos pela voz.

## Computador

O aplicativo Electron real abriu em Linux em modo headless:216cartões, contexto isolado, ponte de recursos e reconhecedor pronto foram observados. O teste completo de microfone simulado ainda não tem resultado aprovado nesta entrega.

O executável Whisper Windows foi compilado estaticamente e seu formato PE64/importações foram conferidos, sem exigir VC++Redistributable separado. O pacote contém Electron, interface, engine e modelo. **Não foi executado em Windows neste ambiente Linux.** Não se afirma que SAPI, microfone, extração pelo CMD ou SmartScreen tenham sido validados em Windows.

Os ZIPs são conferidos por integridade e os arquivos têm SHA256. O assistente de abertura recompõe e verifica o pacote local antes de extrair, sem downloads.

## Assinatura e recursos pendentes

O runtime mínimo de assinatura Windows foi preparado a partir de Temurin oficial com hash fixado. Os módulos e cabeçalhos PE foram verificados; a lógica de assinatura foi ensaiada com runtimeLinux equivalente e chave descartável. Nenhuma chave de publicação acompanha a entrega. Veja ASSINATURA.md.

Não há avatar funcional nem tradução completa para Libras. A prova de download/carregamento de um player oficial não comprova um sinal visível ou uma tradução correta. Não há ilustrações animadas para todas as emoções nem um catálogo universal completo. O usuário pode criar cartões pessoais.

Ainda são necessários voz pt-BR offline instalada, validação em aparelhos reais, precisão adequada, acessibilidade com pessoas usuárias, conclusão de Libras e requisitos da contaPlayConsole. O aplicativo não foi publicado nem aprovado no GooglePlay.

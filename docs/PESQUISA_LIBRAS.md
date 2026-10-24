# Pesquisa técnica de Libras offline

Consulta iniciada em 22/10/2026. Este documento registra evidências e limites; não declara que o avatar ou a tradução já foram incorporados ao Voz e Sinais.

## O que foi localizado e confirmado

- O [player WebGL oficial do VLibras](https://github.com/spbgovbr-vlibras/vlibras-player-webjs) tem licença **LGPL-3.0** e inclui o build Unity pronto: dados, WebAssembly e loader somam cerca de 14 MB. O arquivo de configuração reserva 256 MB de memória. Não é necessário inventar movimentos para fazer o avatar existir.
- O adaptador oferece `setBaseUrl(url)` e `playNow(glosa)`. Portanto há um caminho para servir o player e os sinais a partir de arquivos locais, sem uma conexão externa durante a reprodução.
- O comportamento padrão ainda é online: `GlosaTranslator.js` faz POST para um serviço de tradução e `Player.js` aponta o dicionário para HTTPS. Copiar apenas o widget não entrega um tradutor offline.
- A [aplicação mobile oficial](https://github.com/spbgovbr-vlibras/vlibras-mobile-cross-platform) também inclui um build Unity WebGL, porém seus serviços apontam a tradução para `traducao2.vlibras.gov.br` e os sinais para `dicionario2.vlibras.gov.br`.
- A API pública atual do dicionário respondeu a `GET https://dicionario2.vlibras.gov.br/list` com **24.213 registros**, paginados em 100 itens. A lista antiga no código do repositório contém 17.733 nomes, e não representa sozinha o conjunto atual.
- O sinal real `https://dicionario2.vlibras.gov.br/2018.3.1/WEBGL/BR/FELIZ` foi obtido por HTTPS verificado: 22.246 bytes, cabeçalho `UnityFS`, SHA256 `860b0b30d43be99e816fc6502e7f6bb1c0493929c6d564071fdd506dfb9aad9c`.
- O [repositório oficial de bundles](https://github.com/spbgovbr-vlibras/vlibras-dictionary-bundles) foi encontrado vazio. Isso não significa que os sinais não existam: o endpoint público acima forneceu um bundle válido.

## Tradução local, antes da reprodução

O player recebe uma **glosa**, não produz sozinho uma tradução linguística de português para Libras. Alimentá-lo com palavras em português em maiúsculas não comprova tradução correta.

O [core oficial](https://github.com/spbgovbr-vlibras/vlibras-translator-text-core) é um serviço Python com RabbitMQ no empacotamento de servidor. A biblioteca de tradução pode ser chamada diretamente, dispensando uma fila quando integrada a um aplicativo local.

A biblioteca `vlibras-translator` **1.3.3**, publicada no TestPyPI indicado pelo projeto, tem wheel de 4.170.815 bytes e licença declarada **LGPL-3.0**. Requer NumPy, spaCy, NLTK, joblib, langdetect e rich; Torch e subword-nmt são do extra neural. O modelo `pt_core_news_md` e demais dados precisam acompanhar a instalação: o código tenta baixá-los se faltarem.

O POST público de teste para `https://traducao2.vlibras.gov.br/translate` retornou **500 `Translation Core Unavailable`**. Não foi solicitado nem inventado um token para contornar esse erro do serviço. Uma implementação offline não deve depender dessa API em tempo de uso.

Há uma alternativa oficial já empacotada: o `docker-compose.yml` referencia `vlibras/vlibras-translator-text-core:4.2.0`. A imagem pública foi inspecionada, com cerca de **646 MB comprimidos**. As camadas necessárias foram baixadas e verificadas contra os SHA256 do manifesto do registry. Elas contêm código LGPL da biblioteca antiga 1.0.0rc1, dados linguísticos e um checkpoint neural de 101.041.765 bytes. O código extraído é útil para inspeção, mas não foi tratado como equivalente à versão 1.3.3.

## Reprodução local e tamanho do dicionário

O bootstrap Chromium carregou o WebGL oficial, o avatar Ícaro e o bundle COMER a partir de HTTP em `127.0.0.1`. A interceptação abortava qualquer origem externa; o relatório registrou **zero tentativas externas**. O log confirmou `[BundleLoader]: BUNDLE (COMER) CARREGADO COM SUCESSO` e os callbacks de início/fim da glosa. Isso demonstra carregamento local, mas **não bastou para comprovar a execução correta do sinal**: a análise dos quadros indicou que movimentos posteriores eram do processo aleatório de animações, e a repetição sem esse processo continuou visualmente neutra durante COMER. A compatibilidade do build/rig está sendo verificada com o build mobile; não anunciar avatar funcional somente pelos callbacks.

Foram medidos por HEAD 12 sinais frequentes (COMER, FELIZ, TRISTE, MEDO, RAIVA, ÁGUA, AMOR, OBRIGADO, AJUDAR, POR_FAVOR, BANHEIRO, DESCANSAR): entre 17.094 e 30.258 bytes, média de 22.166 bytes. Extrapolar a amostra para 24.213 registros resulta em cerca de 537 MB; **é estimativa enviesada de amostra, não tamanho total medido**.

## Distribuição oficial e licenças

O [portal oficial da suíte](https://github.com/spbgovbr-vlibras/vlibras-portal) usa a branch `dev`, commit `1641a6f73e53c8c0c6fd0914dbc9109e5c490417`, e contém `LICENSE` LGPL-3.0. Seu `index.html` descreve o conjunto como código aberto e oferece explicitamente o [modelo do avatar Ícaro](https://github.com/spbgovbr-vlibras/vlibras-portal/blob/dev/files/BLENDER_PADRAO_VLIBRAS.zip), além de binários Windows, Python e pacotes de sinais. Não foi inferida uma proibição de redistribuição apenas porque a API de sinais não tem um campo de licença. As cópias precisam preservar as licenças, os avisos de terceiros e as condições LGPL pertinentes.

Os pacotes Windows oficiais inspecionados são `files/desktop/Application Files/AtualizadorVLibras_6_0_0_1/VLIBRAS.zip` (25.622.858 bytes) e `python.zip` (77.168.164 bytes). O primeiro inclui o player Unity e fontes Python. O segundo inclui Python 3.6 para Windows, a biblioteca antiga `vlibras_translate` 1.1.1, NLTK, pyjnius, classificador HunPos de 11 MB e CoGrOO Java de 15,7 MB. `ClipboardAndTranslate.py` tenta primeiro a API e usa `Translation().rule_translation(c)` como alternativa local. `servent.py` chama essa tradução local e comunica a glosa por socket `127.0.0.1:10000`.

O modelo linguístico Aelius nesse pacote possui aviso **OpenContent License 1.0**, que deve acompanhar a redistribuição, além de licenças dos demais componentes. Não substituir todos esses avisos por uma única LGPL genérica.

## Limite do caminho neural para Android

Na biblioteca extraída da imagem oficial 4.2.0, `DeepTranslation` usa **Fairseq LightConvModel**. O modelo recebe glosa preliminar, não português bruto. `Translator.translate(neural=True)` primeiro executa tokenização, lematização e regras com spaCy, depois chama `self.dl.translate(gloss)`. Converter somente o checkpoint de 101 MB para ONNX não remove esse estágio linguístico e não produz um tradutor Android equivalente. Ainda seria necessário portar e validar o pré-processamento, o encoder/decoder LightConv, BPE, geração e pós-processamento. Não foi iniciada uma instalação de Torch de grande volume nem afirmada compatibilidade ONNX sem teste.

## Estado das próximas verificações
- Ainda não demonstrado: execução do tradutor local, geração da glosa e reprodução offline da frase completa no Android e no Windows.
- Ainda não demonstrado: equivalência linguística/compreensão com pessoas surdas e profissionais de Libras.

## Requisitos para um resultado completo

1. Empacotar o player e os sinais reais, respeitando as licenças e avisos aplicáveis.
2. Empacotar um tradutor local com seus modelos e dependências, sem download oculto durante uma conversa.
3. Integrar captura/transcrição, tradução e reprodução da glosa com contexto e expressões apropriados.
4. Validar reprodução e compreensão com o público, incluindo negações e frases diferentes de um catálogo fixo.

Um banco de frases exatas com glosas revisadas pode entregar um conjunto limitado de mensagens offline. Não equivale ao requisito de traduzir qualquer fala em Libras. Soletração e animações genéricas não devem ser anunciadas como essa tradução.

## Fontes inspecionadas

- Player: commit `5389767f8dcb915e6cd1a768095bfefa825c3d14`, em especial `src/Player.js`, `src/PlayerManagerAdapter.js`, `src/GlosaTranslator.js`, `src/config.js`, `src/target/playerweb.json` e `LICENSE`.
- Mobile: commit `caa9f0f4616389f62c7d4aa62f12cea2990f02f8`, especialmente `src/services/unity.ts`, `src/services/translate.ts` e `public/final/Build/`.
- Text core: commit `550b5eb215ec080dd9a50055f3f92de3b4bbdf8b`, `Dockerfile`, `docker-compose.yml`, `src/worker.py`, `src/config.py` e `LICENSE`.
- [Dicionário/repository](https://github.com/spbgovbr-vlibras/vlibras-dictionary-repository): commit `bf1ed09187d347112ee84f1b9e312d267728fc76`, `src/services/FileService.js`, `src/services/SignService.js` e `src/database/resources/`.
- Metadados da biblioteca: `https://test.pypi.org/pypi/vlibras-translator/json`.

Os clones, bundles e experimentos desta pesquisa ficam fora do checkout, em `/workspace/.toolchains/libras-research`, e não foram incorporados automaticamente ao aplicativo.

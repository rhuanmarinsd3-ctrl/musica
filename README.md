# Voz e Sinais

Aplicativo Android de comunicação em português do Brasil, sem anúncios. Esta é uma **primeira versão para desenvolvimento e testes**, ainda não publicada no Google Play.

## O que já foi implementado

- Cartões de emoções, necessidades, saúde e conversa com imagem, texto e fala ao tocar.
- Busca, categorias e favoritos salvos no aparelho.
- Texto livre e frases pessoais para ler em voz alta.
- Captura pelo microfone e transcrição **local**, com resultados completos e parciais.
- Visualização da transcrição em texto ou com imagens de palavras citadas.
- Interface acessível com controles grandes, navegação por teclado e respeito à preferência de reduzir animações.
- Site estático de apresentação, download de APK e política de privacidade.

**Libras e avatar ainda não foram implementados.** A interface identifica essa limitação. Uma tradução adequada precisa de conteúdo, gramática, movimentos e expressões validados por pessoas surdas e profissionais de Libras. Imagens por palavras-chave não são tradução de Libras nem interpretação da emoção de quem fala.

## Funcionamento sem internet

O aplicativo não declara a permissão `INTERNET`. Não usa reconhecimento de fala na nuvem, anúncios, contas ou métricas de uso. Áudio do microfone não é gravado em arquivos; a captura termina ao sair da tela de escuta ou colocar o aplicativo em segundo plano.

Para falar textos, o aparelho precisa ter uma **voz pt-BR offline instalada** no mecanismo de texto para fala do Android. O app só seleciona vozes que declaram funcionamento local. Sem uma voz compatível, mostra uma orientação em vez de enviar texto para a rede.

Há duas variantes de compilação:

| Variante | Reconhecimento da fala | Disponibilidade |
| --- | --- | --- |
| `device` | Reconhecedor explicitamente **on-device** do Android 12+, se o aparelho e o idioma estiverem preparados. | Permite testar a interface e a voz mesmo sem o modelo Vosk. Em aparelhos sem o serviço/idioma local, a escuta fica indisponível. |
| `bundled` | Modelo Vosk de português incluído no APK, com alternativa on-device quando disponível. | Requer preparar o modelo antes de compilar. Não precisa baixá-lo durante o uso. |

A transcrição pode errar: confira o texto, especialmente nomes, números e frases negativas. Não há reconhecimento automático de sentimentos na voz.

## Compilar para Android

Use Android Studio ou JDK 17/21, Android SDK **36**, Build Tools **36.0.0** e o Gradle Wrapper incluído. Configure o SDK em `local.properties` (`sdk.dir=...`) ou `ANDROID_HOME`.

```sh
./gradlew assembleDeviceDebug lintDeviceDebug
```

O APK de testes estará em `app/build/outputs/apk/device/debug/`. Ele usa uma assinatura de desenvolvimento e não deve ser publicado no Google Play.

Para incluir o modelo de reconhecimento (variante usada no APK principal de demonstração):

```sh
python3 scripts/prepare_model.py
./gradlew assembleBundledDebug lintBundledDebug
```

O script obtém `vosk-model-small-pt-0.3` pelo HTTPS oficial, verifica seu SHA256 fixado, valida a estrutura do ZIP e registra a origem em `source.json`. Não desliga TLS. Também aceita o mesmo ZIP local com `--archive arquivo.zip`. O formato legado desse modelo é suportado oficialmente pelo Vosk; os arquivos originais são preservados.

O acesso a `alphacephei.com` é necessário **apenas durante a preparação**. Se a rede bloquear esse domínio, libere-o nas configurações do ambiente. A variante `bundled` recusa compilar sem o modelo; a `device` não o inclui.

## Testar a interface

Node.js e Chromium são necessários somente nos testes de desenvolvimento. Os scripts de preparação usam Python 3.12 ou mais recente:

```sh
npm ci
npm test
```

Os testes usam o Chromium do sistema, verificam interação, entrada de texto, ponte Android simulada, acessibilidade e ausência de chamadas externas. Eles não substituem o teste de áudio em um celular real. Para explorar a interface no navegador, sirva `app/src/main/assets/web/` com um servidor estático; a escuta offline requer o app Android. Não se usa `SpeechRecognition` online no navegador.

## Pacote completo para baixar e usar no PC

O guia [COMO_USAR_PACOTE.md](docs/COMO_USAR_PACOTE.md) explica como extrair todos os arquivos, usar o site, testar o APK e preparar a assinatura de produção. O AAB de entrega continua **sem assinatura de produção**, e as limitações descritas neste README permanecem.

Depois de compilar, gere os pacotes com:

```sh
python3 scripts/package_delivery.py
```

O pacote completo fica em `dist/voz-e-sinais-completo.zip` e inclui código, modelo português, APK de teste, site e AAB sem assinatura. Não inclui chaves privadas, caches ou os MP3s preexistentes. O ZIP do site fica em `dist/voz-e-sinais-site.zip`.

## Site e distribuição

O site em `site/` não precisa de build. Para disponibilizar o APK principal de demonstração, copie o resultado de `assembleBundledDebug` para `site/downloads/voz-e-sinais-demo.apk`. O botão de download só é habilitado quando o arquivo estiver disponível. Não há link de Play Store inventado.

O botão “Abrir versão web” leva a `site/app/index.html`, com cartões e escrita para falar usando uma voz local compatível no navegador. A transcrição offline pelo microfone é exclusiva do aplicativo Android. Para hospedar, envie **somente o conteúdo de `site/`**, incluindo `app/` e `downloads/`, para sua hospedagem HTTPS. Atualize as cópias da interface com `python3 scripts/sync_web_site.py`; o empacotador já executa essa etapa.

Antes de publicar, conclua [as etapas de produção](docs/PUBLICACAO.md), revise a [política de privacidade](docs/PRIVACIDADE.md) e teste com pessoas que usarão o aplicativo. Faltam o avatar de Libras, testes em dispositivos reais, assinatura de produção e envio às lojas. Leia também [as decisões e limitações](docs/DECISOES.md).

Os MP3s e o arquivo de texto que já estavam neste repositório foram preservados e **não são incluídos no aplicativo**. Os emojis são renderizados pela fonte local do dispositivo; não há pacote de imagens obtido de terceiros.

## Dependências

- Android SDK e Android Gradle Plugin 8.13.0.
- Vosk Android 0.3.75, Apache-2.0.
- JNA 5.18.1, Apache-2.0/LGPL-2.1 (distribuição sob a opção Apache-2.0).
- Modelo Vosk pequeno de português 0.3, Apache-2.0, quando incluído.

As licenças dos componentes de terceiros continuam aplicáveis. Veja `THIRD_PARTY_NOTICES.md`.

## Ambiente de desenvolvimento na nuvem

As ferramentas podem ser preparadas em Linux x86_64 dentro do workspace, sem alterar os arquivos do sistema:

```sh
python3 scripts/cloud_setup.py
. scripts/cloud-env.sh
python3 scripts/prepare_model.py
npm ci --ignore-scripts --no-audit --no-fund
./gradlew assembleBundledDebug lintBundledDebug bundleBundledRelease
npm test
```

O script preserva verificação TLS e checksums, ativa o JDK/SDK e usa caches fora do repositório. O `.aab` gerado ainda precisa da assinatura de produção e das etapas de revisão/publicação. Nenhum arquivo de chave privada é incluído.

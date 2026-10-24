# Componentes redistribuídos

## Whisper.cpp e modelo Whisper

Whisper.cpp 1.9.5, commit `d1be6fde11ac6e0407606b4e42fe72d34add8037`, licença MIT. Fonte e licença: https://github.com/ggml-org/whisper.cpp. A cópia usada na compilação Android está em `app/src/main/cpp/third_party/whisper/`, com `LICENSE` e `SOURCE.json`. O programa Windows inclui o CLI compilado estaticamente e a licença em `resources/app/licenses/`.

Modelo Whisper Tiny multilíngue, licença MIT de OpenAI: https://github.com/openai/whisper e https://huggingface.co/ggerganov/whisper.cpp. O arquivo distribuído é `ggml-tiny.bin`, SHA256 `be07e048e1e599ad46341c8d2a135645097a538221678b7acdd1b1919c6e1b21`. Os scripts preservam o modelo e verificam o hash oficial. A licença MIT do Whisper está incluída junto ao modelo.

## Electron

Electron 45.0.0, licença MIT: https://github.com/electron/electron. A distribuição Windows inclui `LICENSE` e `LICENSES.chromium.html`, além dos avisos das dependências. Preserve todos ao redistribuir o programa. Electron/Chromium incorporam componentes sob outras licenças, identificados nesses arquivos.

## Java mínimo de assinatura

Eclipse Temurin 21.0.12.1+1, OpenJDK, GPLv2 com Classpath Exception e componentes sob as licenças documentadas em `entrega/google-play/assinatura-java/legal/`. Não faz parte do aplicativo Android; é uma ferramenta local para o responsável assinar o AAB. Fonte correspondente e checksum oficial estão em [docs/ASSINATURA.md](docs/ASSINATURA.md). Preserve os avisos, `release` e `SOURCE.json` do runtime.

## Arte e pesquisa de Libras

As imagens dos cartões são caracteres emoji renderizados pela fonte local do sistema. O projeto não redistribui fontes de emoji. Os MP3s originais não entram no aplicativo.

A pesquisa do VLibras e suas referências estão em `docs/PESQUISA_LIBRAS.md`. Os arquivos experimentais externos usados na pesquisa não acompanham o produto e não representam um tradutor implementado.

## Desenvolvimento e histórico

Gradle, Android SDK/NDK/CMake, Android Gradle Plugin, Playwright, axe-core e LLVM-MinGW têm suas próprias licenças. Preserve as licenças dos componentes nativos do toolchain redistribuídos. As ferramentas de teste e os caches não entram no APK.

A versão anterior experimentou Vosk e JNA. Eles não são dependências de execução desta versão. O aviso histórico JNA-LICENSE.txt pode permanecer nos assets sem indicar uso do código JNA. Não há modelo Vosk no pacote novo.

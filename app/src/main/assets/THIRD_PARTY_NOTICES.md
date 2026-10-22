# Componentes de terceiros

## Vosk

Vosk Android `com.alphacephei:vosk-android:0.3.75`.

- Projeto: https://github.com/alphacep/vosk-api
- Licença: Apache License 2.0.
- O AAR contém bibliotecas nativas e os avisos distribuídos pelo fornecedor. Preserve os avisos ao redistribuir.

## Modelo de português

`vosk-model-small-pt-0.3`, quando obtido por `scripts/prepare_model.py` e incluído na variante `bundled`.

- Fonte oficial: https://alphacephei.com/vosk/models
- Licença declarada pelo fornecedor: Apache License 2.0.
- O hash do arquivo obtido é registrado nos metadados locais `source.json`. Nenhum modelo de terceiros foi substituído silenciosamente.

## JNA

`net.java.dev.jna:jna:5.18.1`.

- Projeto: https://github.com/java-native-access/jna
- Licenças oferecidas pelo projeto: Apache License 2.0 ou LGPL 2.1. Esta distribuição usa a opção Apache License 2.0.

## Ferramentas de desenvolvimento

Gradle, Android SDK, Android Gradle Plugin, Playwright e axe-core têm suas próprias licenças. Não fazem parte do código de interface embarcado no aplicativo; as ferramentas de teste não são empacotadas no APK.

As imagens do catálogo usam caracteres emoji da fonte do sistema do usuário, sem redistribuir arquivos de fonte. Nenhum dos arquivos de música preexistentes faz parte do aplicativo.

Antes de publicar uma distribuição de produção, confira os arquivos LICENSE/NOTICE de todos os artefatos efetivamente empacotados e inclua os avisos exigidos. O conteúdo de Libras ainda não está disponível e precisará ter autoria, autorização de uso e validação documentadas.

# APK de demonstração

O arquivo principal usa a variante `bundled`, com o modelo português dentro do APK. Prepare o modelo e compile antes de disponibilizar o download:

```sh
python3 scripts/prepare_model.py
./gradlew assembleBundledDebug
cp app/build/outputs/apk/bundled/debug/app-bundled-debug.apk site/downloads/voz-e-sinais-demo.apk
cd site/downloads
sha256sum voz-e-sinais-demo.apk > voz-e-sinais-demo.apk.sha256
```

O APK e seu hash são artefatos gerados e ficam fora do Git. Não substituir por um arquivo vazio ou habilitar manualmente o botão quando o arquivo não existe. A página consulta a disponibilidade por HTTP.

Este APK tem assinatura de desenvolvimento. Para um lançamento público, conclua as etapas em `docs/PUBLICACAO.md`, use uma chave de produção e teste a instalação e atualização. O site não foi publicado automaticamente.

# Voz e Sinais

Comunicação em português do Brasil para todas as idades, com aplicativos Android e Windows, sem anúncios. **A versão 0.2 é para testes: a tradução completa para Libras e a validação de produção ainda não foram concluídas.**

## Usar no computador

Baixe o pacote completo, escolha **Extrair Tudo** e abra **ABRIR-NO-WINDOWS.cmd** na pasta extraída. Na primeira abertura, ele confere e extrai automaticamente o aplicativo Windows. Depois abre uma janela própria, sem site, servidor, Python ou Java instalado. Requer Windows 10/11 de 64 bits e aproximadamente 1,5 GB livres para a extração.

O reconhecimento de voz acompanha o pacote. Para ler mensagens em voz alta é necessária uma voz pt-BR offline instalada no Windows. A versão Windows foi compilada em Linux; o aplicativo equivalente foi executado em Linux, mas não houve execução em um computador Windows neste ambiente. Veja [as evidências e os limites](docs/VALIDACAO.md).

## Recursos implementados

- 216 cartões de sentimentos, necessidades, saúde e comunicação; 158 abordam sentimentos e experiências afetivas. Cada cartão tem emoji, texto e frase para falar.
- Busca, categorias, favoritos e criação, edição e exclusão de cartões pessoais.
- Texto digitado e frases salvas para leitura em voz alta com voz local.
- Microfone com reconhecimento local em português, usando Whisper.cpp e modelo incluído.
- Transcrição integral e imagens associadas a palavras mencionadas, preservando frases negativas.
- Controles grandes, teclado, preferência de reduzir movimentos e verificações automáticas de acessibilidade.

O catálogo pode ser ampliado por quem usa. Não existe uma lista universal e finita de “todas as emoções”; os 216 cartões não são apresentados como tal. As imagens são emojis do sistema, não ilustrações animadas de cada expressão. As imagens por palavras não interpretam o sentimento da pessoa nem substituem o contexto.

**O avatar e a tradução arbitrária de português para Libras ainda não estão disponíveis no app.** A pesquisa utiliza componentes oficiais do VLibras; testes de carregamento não equivalem a uma tradução funcional. Veja [LIBRAS.md](docs/LIBRAS.md) e [a pesquisa](docs/PESQUISA_LIBRAS.md).

## Android e Google Play

Para instalar e testar no celular, transfira `site/downloads/voz-e-sinais-demo.apk`. Esse APK tem assinatura de desenvolvimento. O aplicativo requer Android 8 ou posterior, processador arm64 ou x86_64 e uma voz pt-BR offline instalada para falar textos.

O arquivo `entrega/google-play/voz-e-sinais-sem-assinatura.aab` é um bundle para assinatura, não um aplicativo instalável. Abra `entrega/google-play/ASSINAR-PARA-PLAY.cmd` no Windows para criar sua chave local ou usar uma existente e assinar o bundle. A chave e a senha ficam sob seu controle. Consulte [ASSINATURA.md](docs/ASSINATURA.md) e [PUBLICACAO.md](docs/PUBLICACAO.md).

Assinar o AAB não publica nem garante aprovação na Play. Ainda são necessários conta Play Console, dados do responsável, política pública de privacidade e testes, além de concluir os recursos pendentes.

## Funcionamento offline e privacidade

O APK não declara `INTERNET`. O aplicativo Windows bloqueia requisições externas. Não há anúncios, contas, métricas de uso ou reconhecimento pela nuvem. O modelo é entregue junto e não precisa ser baixado na primeira conversa.

No Android o áudio é processado em memória. No computador são criados arquivos temporários locais, apagados após cada trecho e na saída normal; uma interrupção forçada pode deixar arquivos até a próxima limpeza. Cartões, favoritos e frases ficam no dispositivo. A leitura exige uma voz local compatível; sem ela o app orienta a instalação. O reconhecimento pode errar palavras, números e negações: confira o texto. Veja [PRIVACIDADE.md](docs/PRIVACIDADE.md).

## Compilar e verificar

Ferramentas de desenvolvimento: Python 3.12+, Node, Chromium, JDK 21, Android SDK 36, NDK 28.2.13676358 e CMake 3.22.1. As ferramentas não são exigidas de quem usa o pacote Windows.

```sh
python3 scripts/cloud_setup.py
. scripts/cloud-env.sh
python3 scripts/prepare_whisper.py
python3 scripts/prepare_whisper_model.py
npm ci --ignore-scripts --no-audit --no-fund
./gradlew assembleBundledDebug lintBundledDebug bundleBundledRelease --no-daemon --console plain
npm test
```

A fonte Whisper.cpp 1.9.5 e os downloads têm checksums fixados. O modelo fica em `app/src/bundled/assets/whisper/`. A variante `bundled` exige o modelo; a variante opcional `device` depende exclusivamente de um reconhecedor explicitamente on-device do Android 12+. Nenhuma usa reconhecimento remoto.

Para gerar a versão portátil e a entrega:

```sh
python3 scripts/build_desktop.py --platform windows
python3 scripts/prepare_pc_delivery.py
python3 scripts/prepare_signing_runtime.py
python3 scripts/sync_web_site.py
python3 scripts/package_delivery.py
```

Atualize a cópia do APK em `site/downloads/` após compilar. O empacotador confere os assets do APK contra o fonte. `dist/voz-e-sinais-completo.zip` reúne código, modelo, Android, Windows, assinatura local e site opcional; `entrega/ARQUIVOS-SHA256.txt` identifica os arquivos. Chaves privadas, caches e músicas não entram no pacote.

## Site opcional e código original

`site/` pode ser hospedado como conteúdo estático HTTPS. O aplicativo Windows funciona sem hospedagem. A página web oferece cartões e texto para falar com uma voz local do navegador; não oferece reconhecimento local pelo microfone. Sincronize a interface com `python3 scripts/sync_web_site.py`.

Os MP3s e o arquivo de texto preexistentes foram preservados na branch original e não são incluídos no aplicativo. As licenças dos componentes redistribuídos estão em [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

# Validação da primeira versão

Data: 22 de outubro de 2026. Nome confirmado pelo usuário: **Voz e Sinais**, para todas as idades.

## Compilação Android

`assembleBundledDebug`, `lintBundledDebug` e `bundleBundledRelease` foram executados com sucesso. O app tem mínimo Android 8/API 26 e destino API 36. O APK de demonstração usa assinatura de desenvolvimento; o AAB não tem assinatura de produção. Nenhum deles foi publicado.

O APK foi conferido com `apksigner verify` e `zipalign -c -P 16`. As bibliotecas nativas arm64 e x86_64 também têm segmentos ELF alinhados a pelo menos 16 KB. O manifesto empacotado declara somente a permissão de microfone, sem `INTERNET`. Os MP3s originais não estão no APK. Os assets da interface e os 16 arquivos do modelo incluídos no APK foram comparados aos arquivos preparados.

O download do APK pelo servidor estático local foi exercitado, e o SHA256 do conteúdo baixado correspondeu ao arquivo gerado. Os resultados em `test-results/` e os pacotes em `app/build/outputs/` e `site/downloads/` são artefatos locais gerados, ignorados pelo Git.

A tentativa de executar a primeira imagem de emulador API 26 encontrou um pré-requisito ausente na própria imagem: o framework procurava o provider `com.google.android.webview`, mas havia apenas `com.android.webview`. A abertura terminou em `MissingWebViewPackageException`, antes de carregar a interface ou o modelo. Uma imagem Google APIs foi preparada como correção, mas o teste de abertura do aplicativo nela não foi concluído. Portanto não há alegação de execução Android validada, nem de áudio real validado; compilação e testes de navegador são evidências separadas.

## Interface e site

**18 testes automáticos passaram, sem falhas ou testes ignorados.** Eles cobrem cartões, voz via ponte Android simulada, categorias, busca, favoritos persistentes, texto livre, frases salvas, parada da fala, transcrição cumulativa, negações, formatos de exibição, limpeza de resultados atrasados, ausência de reconhecimento de nuvem no navegador, proteção contra HTML injetado e ausência de recursos externos.

Também verificam layouts de celular e computador e auditoria automática WCAG AA nas três abas do app e nas páginas do site. Uma auditoria automática sem violações não substitui a revisão de acessibilidade com pessoas usuárias, TalkBack e fontes ampliadas.

O helper de renderização foi adaptado para WebViews antigas, sem depender de `Element.replaceChildren`. A regressão de compatibilidade deve continuar na suíte.

## Modelo de português e precisão

O modelo `vosk-model-small-pt-0.3` foi obtido da fonte oficial por HTTPS com TLS verificado. Seu SHA256, fixado no script de preparação, é:

```text
6e1ce909032e1afa7a88e68a3d628ecafff302bdf195befab308826c395e93b7
```

A estrutura original é o layout legado suportado pelo Vosk. O script não altera os arquivos do modelo para inventar uma nova estrutura. A preparação foi repetida com sucesso sem sobrescrever o modelo existente.

Uma verificação funcional no host abriu o modelo com Vosk Python 0.3.45 e decodificou áudio PCM 16-bit mono a 16 kHz, gerado localmente por eSpeak-NG em pt-BR:

| Frase de referência | Resultado real |
| --- | --- |
| eu quero comida por gentileza | obrigada por gentileza |
| eu quero água | água |

**Nenhuma das duas transcrições ficou exata.** Carga e decodificação funcionaram, mas o teste não sustenta alegação de boa precisão. Trata-se de fala artificial e de uma versão do decoder no host diferente do AAR Android 0.3.75; não mede a precisão com fala humana no celular. O problema precisa ser avaliado com pessoas, sotaques e ambientes representativos antes do lançamento. O app mostra aviso para conferir o texto e não interpreta emoções pela voz.

## O que ainda não foi validado para produção

- Microfone e voz pt-BR offline em celulares reais, inclusive modo avião, primeira instalação, permissão recusada, retorno das configurações e interrupções por outros apps.
- Precisão suficiente da transcrição para o uso pretendido.
- Compreensão dos pictogramas e usabilidade com pessoas de diferentes idades e necessidades.
- Avatar/tradução de Libras: **não implementados**, dependem de conteúdo e validação linguística; veja [LIBRAS.md](LIBRAS.md).
- Assinatura de produção, responsável/contato da política de privacidade, conta e revisão do Google Play e hospedagem pública do site.

A configuração reutilizável do ambiente foi salva em rascunho (`install_script`, `start_skill` e o domínio do fornecedor do modelo). Isso não publica o aplicativo nem confirma publicação de um snapshot do ambiente.

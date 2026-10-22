# Como usar o pacote do Voz e Sinais

Este pacote é uma versão de desenvolvimento. **Ainda não está pronto para lançamento na Google Play:** Libras não foi implementada, a transcrição apresentou erros e faltam testes em celulares reais.

## Abrir no computador

1. Salve o ZIP no seu PC. No Windows, clique nele com o botão direito e escolha **Extrair Tudo**.
2. Abra a pasta extraída. Ela contém o código Android, o modelo de português, o site e os arquivos de teste.
3. Para editar o aplicativo, instale o Android Studio e use **File > Open** na pasta que contém `settings.gradle`.
4. Para usar os cartões e a escrita no navegador do PC, abra o site hospedado e escolha **Abrir versão web**.

| Arquivo ou pasta | Para que serve |
| --- | --- |
| `site/downloads/voz-e-sinais-demo.apk` | Instalar a demonstração em um celular Android. O APK não é um programa para Windows. |
| `entrega/google-play/voz-e-sinais-sem-assinatura.aab` | Bundle de desenvolvimento, **sem assinatura de produção**; não está pronto para envio à loja. |
| `site/` | Site de apresentação, privacidade, download do APK e acesso à versão web. |
| `site/app/index.html` | Interface web com cartões e escrita; fala apenas se houver voz local compatível no navegador. |
| `app/src/bundled/assets/model-pt-br/` | Modelo de reconhecimento local de português incluído no aplicativo. |

A leitura em voz alta exige uma voz **pt-BR offline instalada no Android**. O modelo de transcrição já acompanha a variante principal, mas pode reconhecer palavras incorretamente.

## Colocar o site na sua hospedagem

Envie **somente o conteúdo da pasta `site/`** para a área pública da sua hospedagem HTTPS, mantendo a pasta `downloads/` e seus arquivos. O início do site é `index.html`.

O site apresenta o projeto, oferece o APK e abre a versão web com cartões e escrita. Mantenha também a pasta `app/` dentro de `site/`. **A versão web não oferece transcrição offline pelo microfone nem Libras.** A fala dos cartões e do texto exige uma voz local compatível no navegador. Não precisa de servidor de aplicação, conta ou banco de dados. Não publique a raiz inteira do projeto, arquivos de assinatura ou senhas.

## Preparar para a Google Play

Não envie o ZIP à loja. Primeiro conclua os recursos pendentes, melhore a precisão e teste o app em celulares reais, inclusive sem internet. Depois, no Android Studio, use **Build > Generate Signed Bundle / APK > Android App Bundle** para gerar um AAB com sua própria chave de assinatura; proteja a chave e suas senhas.

Você também precisará de uma conta no Play Console, ficha do aplicativo, política de privacidade com responsável e contato, declarações exigidas e testes da loja. O AAB deste pacote não substitui essas etapas.

Consulte [as instruções de publicação](PUBLICACAO.md), [a política de privacidade](PRIVACIDADE.md) e [os resultados da validação](VALIDACAO.md). Nenhum site ou aplicativo foi publicado automaticamente.

# Distribuição na Google Play e pelo site

O projeto ainda não está publicado. Um APK de demonstração, quando gerado, serve para testes e não equivale a um lançamento na Google Play. O site só deve habilitar o download quando o arquivo correspondente existir.

## Conferir antes de gerar a versão pública

- Testar em aparelhos Android reais, inclusive em modo avião, após fechar e reabrir o aplicativo. Confirmar cartões, leitura de texto livre, voz pt-BR local instalada, transcrição local compatível com a variante testada e encerramento do microfone ao sair da tela ou colocar o app em segundo plano.
- Testar o primeiro uso com permissão do microfone recusada, voz local ausente, pouco armazenamento e aparelho sem conexão. O aplicativo deve explicar o que falta sem recorrer a um serviço online.
- Conferir acessibilidade com pessoas do público: TalkBack, contraste, botões grandes, tamanho de fonte do sistema, orientação da tela e movimento reduzido. Pictogramas não devem ser a única forma de ler uma transcrição.
- Revisar a precisão da fala transcrita em diferentes sotaques e ambientes. Não anunciar detecção de emoções pela voz nem tradução completa para Libras.
- Revisar a segurança do WebView e da ponte nativa, dependências e permissões. A versão Android deve continuar sem `INTERNET` e sem publicidade ou análise de uso.
- Revisar a [política de privacidade](PRIVACIDADE.md), preencher responsável e contato, confirmar política de backup e hospedar o texto final em HTTPS.
- Conferir licenças e avisos das dependências, do modelo Whisper Tiny exato distribuído, de arte, fontes, sons e futuros vídeos de Libras. A presença de músicas no repositório não autoriza sua inclusão no aplicativo.

## Libras

O avatar de Libras e a tradução de conversas ainda são pendências de produto. Antes de oferecê-los, preparar conteúdos e traduções com profissionais de Libras e pessoas surdas, obter as autorizações de uso e verificar compreensão no público-alvo. Um avatar com movimentos inventados ou uma sequência de sinais por palavra não comprova tradução correta. Até a validação, manter o recurso identificado como indisponível.

## Assinatura e arquivos de distribuição

1. Escolher o identificador definitivo do aplicativo e os números de versão. O identificador precisa permanecer estável para atualizações.
2. Criar e proteger a chave de produção. Não colocar keystore, senhas ou valores de credenciais no Git. Manter cópia de segurança em local seguro.
3. O comando `bundleBundledRelease` não configura uma assinatura de produção por si só; o AAB de desenvolvimento gerado sem essa configuração ainda precisa ser assinado. Gerar um **Android App Bundle (`.aab`) assinado** para a Play e um **APK assinado** para distribuição direta. As instruções de build do projeto devem apontar para o mecanismo de assinatura efetivamente configurado; não distribuir uma compilação de depuração como versão final.
4. Decidir a estratégia de assinatura antes da primeira publicação. Para que um APK baixado pelo site atualize a mesma instalação feita pela Play, ele precisa ser compatível com o mesmo identificador e certificado de assinatura do aplicativo instalado. Com Play App Signing, a chave de upload pode ser diferente da chave usada para assinar o aplicativo entregue aos usuários. Verificar a opção correta no Play Console.
5. Registrar o hash SHA-256 de cada APK publicado, a versão e as notas de lançamento. Assinatura Android é necessária; um hash no site não a substitui.

## Google Play

Preparar uma conta do responsável no Play Console, ficha em português, ícone, capturas reais, classificação de conteúdo, declaração de público-alvo e política de privacidade pública. Preencher Segurança dos dados e as declarações de permissões de acordo com o APK real, inclusive o uso local do microfone. Sem anúncios deve corresponder à ausência de SDKs de anúncios.

Consultar as exigências atuais de nível de API, testes, verificação da conta e publicação antes de enviar; essas regras mudam. Começar com a faixa de testes apropriada, examinar o relatório de pré-lançamento e corrigir problemas antes da produção. Não anunciar disponibilidade na Play antes de a ficha pública existir.

Referências oficiais: [Play Console](https://play.google.com/console/about/), [nível de API de destino](https://developer.android.com/google/play/requirements/target-sdk), [assinatura de aplicativos](https://developer.android.com/studio/publish/app-signing) e [Segurança dos dados](https://support.google.com/googleplay/android-developer/answer/10787469).

## Site e download direto

O diretório `site/` pode ser servido por uma hospedagem estática HTTPS. Não é preciso um servidor de aplicação. Só publicar arquivos revisados; não servir a raiz inteira do repositório nem arquivos de assinatura.

A demonstração principal usa a variante `bundled`, com o modelo Whisper Tiny de português incluído no APK. O modelo oficial foi obtido e sua integridade foi verificada durante a preparação; o reconhecimento não depende de download durante o uso nem do reconhecedor do sistema. A variante opcional `device` continua disponível para desenvolvimento e só transcreve com reconhecimento explicitamente local compatível no Android 12 ou posterior. Os testes em celulares reais ainda não foram executados, e a leitura em voz alta continua dependendo de uma voz pt-BR offline instalada no Android.

Colocar o APK de `assembleBundledDebug` em `site/downloads/voz-e-sinais-demo.apk` apenas quando esse APK tiver sido gerado e conferido. O botão da página verifica a presença do arquivo antes de habilitar o download. Para o lançamento, usar o APK de produção, indicar a versão, o tamanho, a assinatura/hash e as notas de atualização. Explicar que o Android pode pedir autorização para instalar aplicativos dessa fonte.

A distribuição pelo site também precisa de uma estratégia de atualizações. Novas versões devem manter a assinatura correta e ter `versionCode` maior. Não há atualização automática implementada nesta base. Manter o estado “Google Play em preparação” até que um endereço real da loja esteja disponível.

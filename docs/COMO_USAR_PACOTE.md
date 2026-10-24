# Baixar e usar

Baixe o ZIP completo do link de entrega e escolha **Extrair Tudo** no Windows. Não abra o aplicativo dentro da visualização do ZIP.

## Computador Windows

Abra **ABRIR-NO-WINDOWS.cmd**, na pasta extraída. Ele confere as partes do pacote, extrai o programa e abre o Voz e Sinais. A primeira abertura demora mais e precisa de cerca de 1,5 GB livres. Nas próximas vezes use o mesmo arquivo. Requer Windows 10/11 de 64 bits. Mantenha todos os arquivos juntos.

O programa abre em janela própria e inclui o modelo de reconhecimento. Não exige site, servidor ou ferramentas de programação. Para falar, selecione e instale uma voz de português offline nas configurações de fala do Windows, se ainda não houver uma. Permita o microfone somente ao usar “Ouvir”.

Nos cartões, toque para falar, use a busca ou crie cartões próprios. Em “Escrever”, digite e mande falar. Em “Ouvir”, inicie, converse e pare; a transcrição aparece por trechos. Confira as palavras reconhecidas. O modo de imagens associa algumas palavras a cartões; não detecta sentimentos. Libras completa ainda não está disponível.

A execução real em Windows não foi validada neste ambiente Linux. Consulte [VALIDACAO.md](VALIDACAO.md) antes de distribuir a outras pessoas.

## Celular Android

Transfira `site/downloads/voz-e-sinais-demo.apk` para o celular e instale para testar. O APK exige Android 8+ e processador arm64 ou x86_64. A voz pt-BR deve estar disponível offline no sistema. O modelo de reconhecimento acompanha o APK. Esse APK usa assinatura de desenvolvimento e não é o arquivo de publicação na Play.

## Google Play

Abra `entrega/google-play/ASSINAR-PARA-PLAY.cmd` no Windows. Siga [ASSINATURA.md](ASSINATURA.md), guarde sua chave e assine o AAB incluído. Depois confira [PUBLICACAO.md](PUBLICACAO.md): a publicação depende de sua conta, ficha, política de privacidade e dos testes exigidos. O ZIP não pode ser enviado à Play como aplicativo.

## Hospedar no site, se desejar

Envie somente o conteúdo de `site/` para uma hospedagem HTTPS. Preserve `app/` e `downloads/`. Essa hospedagem é opcional e não é necessária para usar o aplicativo Windows. A página web oferece cartões e leitura de texto com uma voz local compatível; não inclui o motor de reconhecimento.

## Arquivos e integridade

O código está nas pastas `app/` e `desktop/`. O APK fica em `site/downloads/`, e o AAB em `entrega/google-play/`. A distribuição Windows está em `entrega/windows/`; suas partes são recompostas automaticamente. Não é necessário juntá-las manualmente.

`entrega/ARQUIVOS-SHA256.txt` contém os hashes dos arquivos. `entrega/windows/pacote.json` identifica e verifica o programa Windows antes da extração. Nenhuma chave privada acompanha a entrega.

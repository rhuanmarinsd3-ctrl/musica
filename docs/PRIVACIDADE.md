# Privacidade — Voz e Sinais

**Versão de desenvolvimento.** Este texto deve ser conferido com o APK final, receber o nome e o contato do responsável e ser publicado em endereço HTTPS antes da distribuição pública.

O Voz e Sinais foi pensado para ajudar na comunicação sem anúncios, conta ou conexão com a internet. A base do aplicativo usa os recursos descritos abaixo.

## Microfone e transcrição

O aplicativo pede acesso ao microfone quando você escolhe ouvir uma conversa. A permissão é usada para transformar a fala em texto no próprio aparelho, usando exclusivamente um reconhecedor local. Esta demonstração usa a variante `bundled`, com um modelo Whisper Tiny multilíngue incluído no APK, sem depender do reconhecedor do sistema nem baixar o modelo durante o uso. A variante opcional `device`, distribuída separadamente se necessário, depende de Android 12 ou posterior e de um serviço e idioma locais compatíveis instalados; sem esse suporte, sua escuta fica indisponível. Nenhuma variante usa reconhecimento pela nuvem. Você pode interromper a escuta e revogar a permissão nas configurações do Android.

No Android, o aplicativo processa áudio em memória, sem salvar gravações. No computador, cria trechos WAV temporários locais para reconhecimento e os apaga após o processamento e na saída normal; uma interrupção forçada pode deixar arquivos até a limpeza seguinte. Nenhuma das versões envia áudio para servidores. Antes de iniciar, avise à outra pessoa que a conversa será transcrita.

A transcrição pode errar, principalmente com ruído, falas simultâneas e nomes próprios. Confira o texto em informações importantes.

## Texto, favoritos e fala

O texto que você digita, os favoritos e os cartões pessoais ficam no dispositivo. No computador, os dados ficam no perfil local do aplicativo (AppData no Windows); apagar somente a pasta portátil não remove esse perfil. Não há sincronização com uma conta ou serviço do Voz e Sinais. Para remover os dados locais, use as opções de limpeza disponíveis no aplicativo ou limpe os dados dele nas configurações do Android. Desinstalar o aplicativo também remove seus dados locais.

Para ler cartões e textos em voz alta, o aplicativo usa uma voz de português do Brasil instalada no Android ou no Windows e disponível sem rede. Caso ela não esteja instalada, será necessário preparar a voz nas configurações do aparelho. O aplicativo não usa uma voz que exige conexão. O serviço de voz instalado é fornecido e administrado pelo sistema ou fabricante do aparelho; consulte também as configurações desse serviço.

## Coleta e compartilhamento

O aplicativo não inclui publicidade, ferramentas de análise de uso ou cadastro. Não pede nome, e-mail, localização ou lista de contatos. O Android não declara a permissão `INTERNET` e o aplicativo de computador bloqueia requisições externas; o funcionamento de reconhecimento e fala deve ser conferido em modo avião em cada versão distribuída.

O site de apresentação é separado do aplicativo. Se ele for publicado, o provedor de hospedagem poderá registrar informações técnicas das visitas, como endereço IP e horário. A política do site deverá identificar esse provedor e qualquer tratamento efetivamente adotado. Baixar o APK ou instalar uma voz pode exigir conexão, embora o uso dos recursos locais do aplicativo não exija.

## Libras e imagens

Os pictogramas ajudam a visualizar algumas palavras reconhecidas. Eles não detectam emoções pela voz e não substituem a transcrição inteira. A tradução para Libras e o avatar ainda não estão implementados nesta versão. Libras é uma língua própria, e não uma substituição de cada palavra do português por um sinal.

## Antes da publicação

O responsável deverá validar esta política contra o comportamento do APK assinado, conferir no APK final as exclusões de backup e transferência de dados já declaradas no projeto (`allowBackup=false` e regras de extração), informar seu contato e atualizar a política sempre que o tratamento de dados mudar. Enquanto essa conferência estiver pendente, este documento é um rascunho de desenvolvimento.

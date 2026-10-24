# Assinar o AAB no seu computador

O arquivo `entrega/google-play/voz-e-sinais-sem-assinatura.aab` precisa da sua chave de upload para ser enviado à sua conta no Google Play Console. A chave deve ser criada e guardada no seu computador. Ela não está neste projeto e não deve ser enviada ao chat ou a um repositório público.

O assistente acompanha um Java mínimo para Windows x64. Não exige instalar JDK, Android Studio, rede ou permissão de administrador para assinar. A assinatura é uma etapa da publicação: a Google Play ainda exige uma conta de desenvolvedor, os formulários e materiais da loja, testes e análise do aplicativo. O AAB serve para publicação; ele não é o programa para abrir no computador.

## Pelo assistente Windows

1. Extraia **todo** o ZIP em uma pasta do computador. Não execute de dentro do ZIP.
2. Abra `entrega/google-play/ASSINAR-PARA-PLAY.cmd`. Mantenha a pasta `assinatura-java` ao lado dele.
3. Escolha criar/reutilizar a chave em `Documentos\Voz e Sinais\assinatura\upload.p12`, ou usar uma chave que você já possui.
4. Ao criar, escolha uma senha forte e preencha os dados do certificado que o Java solicitar. As senhas são digitadas diretamente no console do Java e não aparecem na tela. O assistente não as recebe em argumentos, arquivos ou variáveis de ambiente.
5. Quando for solicitado, digite a senha para assinar. A criação de uma chave nova e a assinatura são dois comandos; portanto, a senha pode ser pedida novamente.
6. Aguarde a mensagem de assinatura verificada. O resultado é `voz-e-sinais-assinado.aab`, na mesma pasta do assistente. Envie esse AAB ao Play Console.

Uma chave já existente na pasta padrão é reutilizada. O assistente não apaga nem substitui essa chave e recusa substituir um AAB final que já exista. Para assinar uma atualização, guarde ou mova o AAB anterior e coloque o novo AAB sem assinatura na pasta.

Faça uma cópia segura de `upload.p12` e guarde a senha separadamente. A chave e a senha permitem assinar atualizações. Não as coloque no ZIP público, no site, no Git ou em conversas. Quando usar o Play App Signing, siga a orientação do Play Console para a chave de upload; a Google gerencia separadamente a assinatura entregue aos usuários.

O assistente não pede certificado comprado nem serviço de assinatura. Um aviso do Java sobre certificado autoassinado é esperado em uma chave de upload própria. A verificação procura uma assinatura válida no AAB, além de conferir o código de saída do Java. Ela não confirma aprovação ou compatibilidade com todos os requisitos da Play Store.

## Se a assinatura falhar

Confira o caminho da chave, o alias, a senha e o espaço livre. O assistente informa o caminho de qualquer arquivo temporário incompleto para você examinar; ele não remove uma chave pessoal. Se a senha foi perdida, siga o procedimento de recuperação de chave de upload do Play Console, quando aplicável.

O campo de alias do assistente aceita letras sem acento, números, espaço, ponto, hífen e sublinhado, começando com letra ou número. Para uma chave existente com outro alias, execute o comando manual abaixo, usando o alias exato. A senha continua sendo solicitada no console.

## Comandos manuais

Abra o Prompt de Comando na pasta `entrega\google-play`. Estes comandos usam o runtime incluído. Substitua os caminhos e o alias pelos seus. Escolha um caminho de saída que ainda não exista, para preservar versões anteriores.

```bat
assinatura-java\bin\java.exe -m java.base/sun.security.tools.keytool.Main -genkeypair -keystore "%USERPROFILE%\Documents\Voz e Sinais\assinatura\upload.p12" -storetype PKCS12 -alias voz-e-sinais-upload -keyalg RSA -keysize 4096 -validity 10000

assinatura-java\bin\java.exe -m jdk.jartool/sun.security.tools.jarsigner.Main -keystore "%USERPROFILE%\Documents\Voz e Sinais\assinatura\upload.p12" -signedjar voz-e-sinais-assinado.aab voz-e-sinais-sem-assinatura.aab voz-e-sinais-upload

assinatura-java\bin\java.exe -m jdk.jartool/sun.security.tools.jarsigner.Main -verify voz-e-sinais-assinado.aab
```

Crie previamente a pasta da chave e execute o primeiro comando apenas se precisar de uma chave nova. Os comandos não incluem senhas. Não acrescente opções de senha em scripts, arquivos ou variáveis de ambiente. O assistente também pode usar um JDK instalado por `JAVA_HOME` ou o JDK do Android Studio caso o runtime incluído esteja ausente.

## Origem do runtime e validação realizada

O runtime contém somente os módulos `java.base`, `jdk.jartool` e `jdk.crypto.ec` do Eclipse Temurin **21.0.12.1+1, Windows AMD64**, com as dependências resolvidas por `jlink`. As licenças e avisos originais acompanham `assinatura-java/legal`. Ele contém ferramentas públicas e nenhuma chave privada.

- [ZIP oficial Temurin](https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.12.1%2B1/OpenJDK21U-jdk_x64_windows_hotspot_21.0.12.1_1.zip)
- [SHA256 oficial](https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.12.1%2B1/OpenJDK21U-jdk_x64_windows_hotspot_21.0.12.1_1.zip.sha256.txt)
- [Código-fonte correspondente](https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.12.1%2B1/OpenJDK21U-jdk-sources_21.0.12.1_1.tar.gz)

SHA256 do ZIP original:

```text
f9d6e191ab098c0d416e7d588a24420a8621cd2f4720dab2459b8b7b2d2d8b4e
```

O release 21.0.13+9 não tinha binários Windows publicados quando este pacote foi preparado, em 23/10/2026. Por isso, foi usado o release Windows 21 mais recente disponível. O runtime pode ser reproduzido no ambiente Linux de desenvolvimento com:

```sh
python3 scripts/prepare_signing_runtime.py
```

O script baixa por HTTPS, compara o checksum oficial com o SHA256 fixado, confere os módulos extraídos, monta o runtime e verifica os cabeçalhos PE AMD64 de `java.exe` e `jvm.dll` e as classes de keytool/jarsigner na imagem Java. Downloads e o JDK completo ficam fora do repositório, em `/workspace/.toolchains`. A repetição confere e preserva o runtime já gerado; um destino alterado é recusado, sem apagar arquivos.

A assinatura e a detecção de alteração do AAB são ensaiadas com um runtime Linux mínimo equivalente e uma chave de teste descartável, fora do repositório. **O executável e o assistente Windows ainda precisam ser validados em um computador Windows**; a preparação no Linux não substitui essa verificação.

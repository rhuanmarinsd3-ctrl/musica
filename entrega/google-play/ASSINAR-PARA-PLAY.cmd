@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title Voz e Sinais - Assinar para a Google Play
echo.
echo Este assistente assina o AAB neste computador, sem internet.
echo Sua chave e suas senhas ficam somente com voce.
echo Leia COMECE-AQUI.txt, na pasta anterior, antes de publicar.
echo.
set "VOZ_JAVA="
if exist "%~dp0assinatura-java\bin\java.exe" set "VOZ_JAVA=%~dp0assinatura-java\bin\java.exe"
if not defined VOZ_JAVA if defined JAVA_HOME if exist "%JAVA_HOME%\bin\java.exe" if exist "%JAVA_HOME%\bin\jarsigner.exe" set "VOZ_JAVA=%JAVA_HOME%\bin\java.exe"
if not defined VOZ_JAVA if exist "%ProgramFiles%\Android\Android Studio\jbr\bin\java.exe" if exist "%ProgramFiles%\Android\Android Studio\jbr\bin\jarsigner.exe" set "VOZ_JAVA=%ProgramFiles%\Android\Android Studio\jbr\bin\java.exe"
if not defined VOZ_JAVA goto nojava
set "VOZ_INPUT=%~dp0voz-e-sinais-sem-assinatura.aab"
set "VOZ_OUTPUT=%~dp0voz-e-sinais-assinado.aab"
if not exist "%VOZ_INPUT%" goto noinput
if exist "%VOZ_OUTPUT%" goto already_signed
"%VOZ_JAVA%" -version
if errorlevel 1 goto failed
echo.
echo 1. Criar ou reutilizar minha chave em Documentos\Voz e Sinais\assinatura
echo 2. Usar uma chave que eu ja tenho
echo 3. Sair sem alterar arquivos
choice /c 123 /n /m "Escolha 1, 2 ou 3: "
if errorlevel 3 goto cancelled
if errorlevel 2 goto existing
if errorlevel 1 goto default_key
goto cancelled

:default_key
set "VOZ_KEY_DIR=%USERPROFILE%\Documents\Voz e Sinais\assinatura"
set "VOZ_KEYSTORE=%VOZ_KEY_DIR%\upload.p12"
set "VOZ_ALIAS=voz-e-sinais-upload"
if exist "%VOZ_KEYSTORE%" goto reuse_key
echo.
echo Sera criada uma nova chave pessoal neste local:
echo "%VOZ_KEYSTORE%"
echo Guarde uma copia segura da chave e da senha para as proximas atualizacoes.
echo Voce vai escolher a senha no Java; ela nao aparece enquanto voce digita.
echo Preencha os dados do certificado quando o Java perguntar.
echo Esta chave e pessoal: nao a envie ao chat nem a um repositorio publico.
choice /c CS /n /m "C para criar a chave, S para sair: "
if errorlevel 2 goto cancelled
if not errorlevel 1 goto cancelled
if not exist "%VOZ_KEY_DIR%" mkdir "%VOZ_KEY_DIR%"
if errorlevel 1 goto failed
"%VOZ_JAVA%" -Duser.language=pt -Duser.country=BR -m java.base/sun.security.tools.keytool.Main -genkeypair -keystore "%VOZ_KEYSTORE%" -storetype PKCS12 -alias "%VOZ_ALIAS%" -keyalg RSA -keysize 4096 -validity 10000
if errorlevel 1 goto failed
goto sign

:reuse_key
echo.
echo Sua chave ja existe e sera reutilizada. Ela nao sera substituida.
echo "%VOZ_KEYSTORE%"
goto sign

:existing
echo.
echo Informe uma chave local sua. Nao use uma chave de outra pessoa.
set "VOZ_KEYSTORE="
set /p "VOZ_KEYSTORE=Caminho completo da chave: "
if not defined VOZ_KEYSTORE goto cancelled
rem Aspas de arrastar-e-soltar sao removidas; aspas nao fazem parte de caminhos Windows.
set "VOZ_KEYSTORE=%VOZ_KEYSTORE:"=%"
if not exist "%VOZ_KEYSTORE%" goto nokey
set "VOZ_ALIAS="
set /p "VOZ_ALIAS=Alias da chave (nome da entrada no keystore): "
if not defined VOZ_ALIAS goto cancelled
set "VOZ_ALIAS=%VOZ_ALIAS:"=%"
rem O primeiro caractere alfanumerico evita que um alias vire uma opcao do Java.
set VOZ_ALIAS | "%SystemRoot%\System32\findstr.exe" /r /x /c:"VOZ_ALIAS=[A-Za-z0-9][A-Za-z0-9 ._-]*" >nul
if errorlevel 1 goto badalias

:sign
if exist "%VOZ_OUTPUT%" goto already_signed
echo.
echo O Java vai pedir a senha da sua chave, sem exibi-la na tela.
echo Nao ha envio de chave, senha ou audio para a internet.
:temporary_name
set "VOZ_TEMP=%~dp0assinatura-em-preparo-%RANDOM%-%RANDOM%.aab"
set "VOZ_VERIFY=%VOZ_TEMP%.verificacao.txt"
if exist "%VOZ_TEMP%" goto temporary_name
if exist "%VOZ_VERIFY%" goto temporary_name
"%VOZ_JAVA%" -Duser.language=pt -Duser.country=BR -m jdk.jartool/sun.security.tools.jarsigner.Main -keystore "%VOZ_KEYSTORE%" -signedjar "%VOZ_TEMP%" "%VOZ_INPUT%" "%VOZ_ALIAS%"
if errorlevel 1 goto signing_failed
rem A verificacao em ingles permite conferir a confirmacao, inclusive se um JAR estiver sem assinatura.
"%VOZ_JAVA%" -Duser.language=en -Duser.country=US -m jdk.jartool/sun.security.tools.jarsigner.Main -verify "%VOZ_TEMP%" >"%VOZ_VERIFY%" 2>&1
if errorlevel 1 goto verification_failed
"%SystemRoot%\System32\findstr.exe" /l /c:"jar verified." "%VOZ_VERIFY%" >nul
if errorlevel 1 goto verification_failed
rem REN falha se o destino ja existir; nunca substitui um AAB assinado anterior.
ren "%VOZ_TEMP%" "voz-e-sinais-assinado.aab"
if errorlevel 1 goto signing_failed
del "%VOZ_VERIFY%" >nul 2>&1
echo.
echo AAB assinado e assinatura verificada:
echo "%VOZ_OUTPUT%"
echo Envie esse arquivo no Google Play Console, na sua conta de desenvolvedor.
echo Avisos de certificado autoassinado sao normais para uma chave de upload propria.
echo A assinatura nao substitui testes, ficha da loja e revisao da Google Play.
echo Guarde a chave e a senha fora desta pasta de distribuicao.
pause
exit /b 0

:already_signed
echo.
echo Ja existe voz-e-sinais-assinado.aab nesta pasta. Ele foi preservado.
echo Guarde ou mova esse arquivo antes de assinar outra versao.
pause
exit /b 1

:nojava
echo O runtime de assinatura nao foi encontrado. Extraia o pacote completo.
echo A pasta assinatura-java deve ficar ao lado deste assistente.
echo Alternativa: use um JDK 21 instalado e configure JAVA_HOME.
pause
exit /b 1

:noinput
echo O arquivo voz-e-sinais-sem-assinatura.aab nao esta nesta pasta.
echo Extraia todos os arquivos do pacote antes de abrir o assistente.
pause
exit /b 1

:nokey
echo A chave nao foi encontrada. Confira o caminho e tente novamente.
pause
exit /b 1

:badalias
echo Use um alias que comece com letra ou numero e contenha letras sem acento,
echo numeros, espacos, ponto, hifen ou sublinhado.
echo Para outro alias, consulte o comando manual em docs\ASSINATURA.md.
pause
exit /b 1

:verification_failed
echo A assinatura nao passou na verificacao.
if exist "%VOZ_VERIFY%" type "%VOZ_VERIFY%"
goto signing_failed

:signing_failed
echo.
echo O AAB final nao foi criado. A chave e os arquivos anteriores foram preservados.
if exist "%VOZ_TEMP%" echo Arquivo incompleto para examinar: "%VOZ_TEMP%"
if exist "%VOZ_VERIFY%" echo Detalhes da verificacao: "%VOZ_VERIFY%"
echo Confira a senha, o alias e o espaco em disco antes de tentar novamente.
pause
exit /b 1

:failed
echo.
echo Nao foi possivel continuar. Nenhuma chave existente foi apagada.
echo Se uma chave foi criada parcialmente, examine-a antes de tentar de novo.
pause
exit /b 1

:cancelled
echo.
echo Operacao cancelada.
pause
exit /b 0

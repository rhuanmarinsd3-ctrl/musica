@echo off
setlocal
set "VOZ_KIT_DIR=%~dp0"
echo Preparando Voz e Sinais. Na primeira abertura, aguarde a extracao...
powershell.exe -NoLogo -NoProfile -Command "$ErrorActionPreference='Stop'; $b=$env:VOZ_KIT_DIR; $m=Get-Content -LiteralPath (Join-Path $b 'pacote.json') -Raw | ConvertFrom-Json; $d=Join-Path $b ('instalado-'+$m.archive_sha256.Substring(0,12)); $app=Join-Path (Join-Path $d $m.folder) $m.executable; if(!(Test-Path -LiteralPath (Join-Path $d '.completo'))){ $z=Join-Path $b 'aplicativo-completo.zip'; $o=[IO.File]::Open($z,[IO.FileMode]::Create,[IO.FileAccess]::Write); try{ foreach($p in $m.parts){ $f=Join-Path $b $p.file; if((Get-FileHash -LiteralPath $f -Algorithm SHA256).Hash.ToLowerInvariant() -ne $p.sha256){throw ('Parte incompleta: '+$p.file)}; $i=[IO.File]::OpenRead($f); try{$i.CopyTo($o)}finally{$i.Dispose()} }}finally{$o.Dispose()}; if((Get-FileHash -LiteralPath $z -Algorithm SHA256).Hash.ToLowerInvariant() -ne $m.archive_sha256){throw 'Pacote incompleto'}; Expand-Archive -LiteralPath $z -DestinationPath $d -Force; if(!(Test-Path -LiteralPath $app)){throw 'Executavel nao encontrado'}; [IO.File]::WriteAllText((Join-Path $d '.completo'),$m.archive_sha256); Remove-Item -LiteralPath $z }; if(!(Test-Path -LiteralPath $app)){throw 'Aplicativo ausente. Extraia novamente o pacote.'}; Start-Process -FilePath $app -WorkingDirectory (Split-Path -Parent $app)"
if errorlevel 1 (
 echo Nao foi possivel abrir. Confira se extraiu todo o ZIP e tem espaco livre.
 pause
 exit /b 1
)

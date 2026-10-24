#!/usr/bin/env python3
"""Prepara a entrega Windows completa em partes verificadas para GitHub (<100 MB)."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHUNK_SIZE = 48 * 1024 * 1024


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def main():
    source = ROOT / 'dist/pc/Voz-e-Sinais-Windows-x64.zip'
    if not source.is_file():
        raise SystemExit('Execute scripts/build_desktop.py --platform windows primeiro.')
    target = ROOT / 'entrega/windows'
    target.mkdir(parents=True, exist_ok=True)
    previous = target / 'pacote.json'
    old_parts = json.loads(previous.read_text()).get('parts', []) if previous.exists() else []
    parts = []
    with source.open('rb') as input_file:
        number = 1
        while block := input_file.read(CHUNK_SIZE):
            name = f'aplicativo.zip.parte{number:03}'
            path = target / name
            checksum = hashlib.sha256(block).hexdigest()
            if not path.exists() or digest(path) != checksum:
                path.write_bytes(block)
            parts.append({'file': name, 'sha256': checksum, 'bytes': len(block)})
            number += 1
    for part in old_parts:
        if part['file'] not in {p['file'] for p in parts}:
            obsolete = target / part['file']
            if obsolete.parent == target and obsolete.is_file() and digest(obsolete) == part['sha256']:
                obsolete.unlink()
    checksum = digest(source)
    manifest = {'format': 1, 'archive_sha256': checksum, 'archive_bytes': source.stat().st_size,
                'folder': 'Voz-e-Sinais-Windows-x64', 'executable': 'Voz e Sinais.exe', 'parts': parts}
    previous.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    command = (
        "$ErrorActionPreference='Stop'; $b=$env:VOZ_KIT_DIR; "
        "$m=Get-Content -LiteralPath (Join-Path $b 'pacote.json') -Raw | ConvertFrom-Json; "
        "$d=Join-Path $b ('instalado-'+$m.archive_sha256.Substring(0,12)); "
        "$app=Join-Path (Join-Path $d $m.folder) $m.executable; "
        "if(!(Test-Path -LiteralPath (Join-Path $d '.completo'))){ "
        "$z=Join-Path $b 'aplicativo-completo.zip'; "
        "$o=[IO.File]::Open($z,[IO.FileMode]::Create,[IO.FileAccess]::Write); "
        "try{ foreach($p in $m.parts){ $f=Join-Path $b $p.file; "
        "if((Get-FileHash -LiteralPath $f -Algorithm SHA256).Hash.ToLowerInvariant() -ne $p.sha256){throw ('Parte incompleta: '+$p.file)}; "
        "$i=[IO.File]::OpenRead($f); try{$i.CopyTo($o)}finally{$i.Dispose()} }}finally{$o.Dispose()}; "
        "if((Get-FileHash -LiteralPath $z -Algorithm SHA256).Hash.ToLowerInvariant() -ne $m.archive_sha256){throw 'Pacote incompleto'}; "
        "Expand-Archive -LiteralPath $z -DestinationPath $d -Force; "
        "if(!(Test-Path -LiteralPath $app)){throw 'Executavel nao encontrado'}; "
        "[IO.File]::WriteAllText((Join-Path $d '.completo'),$m.archive_sha256); "
        "Remove-Item -LiteralPath $z }; "
        "if(!(Test-Path -LiteralPath $app)){throw 'Aplicativo ausente. Extraia novamente o pacote.'}; "
        "Start-Process -FilePath $app -WorkingDirectory (Split-Path -Parent $app)"
    )
    launcher = ('@echo off\r\nsetlocal\r\nset "VOZ_KIT_DIR=%~dp0"\r\n'
                'echo Preparando Voz e Sinais. Na primeira abertura, aguarde a extracao...\r\n'
                'powershell.exe -NoLogo -NoProfile -Command "' + command + '"\r\n'
                'if errorlevel 1 (\r\n echo Nao foi possivel abrir. Confira se extraiu todo o ZIP e tem espaco livre.\r\n pause\r\n exit /b 1\r\n)\r\n')
    (target / 'INICIAR.cmd').write_bytes(launcher.encode('ascii'))
    (ROOT / 'ABRIR-NO-WINDOWS.cmd').write_bytes(
        b'@echo off\r\ncall "%~dp0entrega\\windows\\INICIAR.cmd"\r\n')
    (target / 'LEIA-ME.txt').write_text(
        'VOZ E SINAIS - WINDOWS 10/11, 64 BITS\n\n'
        'Extraia TODO o ZIP baixado antes de abrir. Depois clique em INICIAR.cmd.\n'
        'Na primeira vez, o programa confere e extrai as partes automaticamente.\n'
        'Nao precisa de site, servidor, Python, Java ou internet para abrir o app.\n'
        'Reserve 1,5 GB livres para a primeira extracao. Mantenha todos os arquivos juntos.\n'
        'O reconhecimento de voz esta incluido. Confira a transcricao, que pode errar.\n'
        'A leitura usa uma voz de portugues offline instalada no Windows.\n'
        'Sem essa voz, instale uma nas configuracoes de fala do Windows.\n'
        'O executavel Windows nao possui certificado de assinatura de codigo.\n'
        'Foi compilado neste ambiente Linux; a execucao real no Windows precisa de validacao.\n', encoding='utf-8')
    print('Entrega Windows preparada:', len(parts), 'partes;', source.stat().st_size, 'bytes; SHA256', checksum)


if __name__ == '__main__':
    main()

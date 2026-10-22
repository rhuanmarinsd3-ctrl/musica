#!/usr/bin/env python3
"""Empacota fonte, modelo, APK, site e AAB sem caches, chaves ou caminhos locais."""
import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ROOT_FILES = [
    '.gitignore', 'README.md', 'THIRD_PARTY_NOTICES.md', 'build.gradle',
    'settings.gradle', 'gradle.properties', 'gradlew', 'gradlew.bat',
    'package.json', 'package-lock.json', 'app/build.gradle',
]
DIRECTORIES = ['app/src', 'gradle', 'docs', 'scripts', 'site', 'tests', 'entrega']
BLOCKED_NAMES = {'local.properties', 'release-signing.properties', '.env'}


def sha256(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def files():
    selected = {ROOT / name for name in ROOT_FILES}
    for directory in DIRECTORIES:
        for path in (ROOT / directory).rglob('*'):
            if path.is_symlink():
                raise RuntimeError('Link simbólico não esperado no pacote: ' + str(path))
            if not path.is_file() or '__pycache__' in path.parts:
                continue
            if path.name.startswith('.env') or path.name in BLOCKED_NAMES or path.suffix.lower() in {'.jks', '.keystore', '.pem', '.key'}:
                raise RuntimeError('Arquivo privado ou local não deve entrar no pacote: ' + str(path.relative_to(ROOT)))
            selected.add(path)
    return sorted(selected)


def verify_inputs():
    apk = ROOT / 'site/downloads/voz-e-sinais-demo.apk'
    aab = ROOT / 'app/build/outputs/bundle/bundledRelease/app-bundled-release.aab'
    if not apk.is_file() or not aab.is_file():
        raise RuntimeError('Compile o APK bundled debug e o AAB bundled release antes de empacotar.')
    with zipfile.ZipFile(apk) as archive:
        if archive.testzip() is not None:
            raise RuntimeError('APK danificado')
        for path in (ROOT / 'app/src/main/assets/web').rglob('*'):
            if path.is_file() and archive.read('assets/web/' + path.relative_to(ROOT / 'app/src/main/assets/web').as_posix()) != path.read_bytes():
                raise RuntimeError('APK desatualizado: ' + str(path.relative_to(ROOT)))
        model = ROOT / 'app/src/bundled/assets/model-pt-br'
        for path in model.rglob('*'):
            if path.is_file() and archive.read('assets/model-pt-br/' + path.relative_to(model).as_posix()) != path.read_bytes():
                raise RuntimeError('Modelo do APK difere do fonte: ' + str(path.relative_to(ROOT)))
    destination = ROOT / 'entrega/google-play/voz-e-sinais-sem-assinatura.aab'
    destination.parent.mkdir(parents=True, exist_ok=True)
    if not destination.exists() or sha256(destination) != sha256(aab):
        shutil.copyfile(aab, destination)
    (ROOT / 'site/downloads/voz-e-sinais-demo.apk.sha256').write_text(
        sha256(apk) + '  voz-e-sinais-demo.apk\n', encoding='utf-8')


def zip_files(target, entries, prefix=''):
    temporary = target.with_suffix('.zip.part')
    with zipfile.ZipFile(temporary, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        directories = set()
        for path, relative in entries:
            name = prefix + relative
            for parent in list(Path(name).parents)[::-1]:
                dirname = parent.as_posix()
                if dirname != '.' and dirname not in directories:
                    info = zipfile.ZipInfo(dirname + '/')
                    info.create_system = 3
                    info.external_attr = (0o40755 << 16) | 0x10
                    archive.writestr(info, b'')
                    directories.add(dirname)
            info = zipfile.ZipInfo(name)
            info.create_system = 3
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = (0o100755 if path.name == 'gradlew' else 0o100644) << 16
            with path.open('rb') as source, archive.open(info, 'w', force_zip64=True) as output:
                shutil.copyfileobj(source, output)
    with zipfile.ZipFile(temporary) as archive:
        error = archive.testzip()
        if error:
            raise RuntimeError('Erro de integridade ZIP: ' + error)
    temporary.replace(target)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--skip-zips', action='store_true', help='Prepara manifesto e AAB, sem gerar ZIPs')
    args = parser.parse_args()
    subprocess.run([sys.executable, str(ROOT / 'scripts/sync_web_site.py')], check=True)
    verify_inputs()
    source_guide = ROOT / 'entrega/LEIA-ME-PRIMEIRO.txt'
    if not source_guide.is_file():
        raise RuntimeError('Guia de entrega ausente')
    (ROOT / 'COMECE-AQUI.txt').write_bytes(source_guide.read_bytes())
    selected = files() + [ROOT / 'COMECE-AQUI.txt']
    manifest_path = ROOT / 'entrega/ARQUIVOS-SHA256.txt'
    selected = sorted(set(path for path in selected if path != manifest_path))
    manifest_path.write_text(''.join(sha256(path) + '  ' + path.relative_to(ROOT).as_posix() + '\n' for path in selected), encoding='utf-8')
    selected.append(manifest_path)
    output = ROOT / 'dist'
    output.mkdir(exist_ok=True)
    description = {'files': [path.relative_to(ROOT).as_posix() for path in sorted(selected)],
                   'largest_file_bytes': max(path.stat().st_size for path in selected),
                   'note': 'APK de teste e AAB sem assinatura de produção; Libras e validação de precisão pendentes.'}
    (output / 'delivery-files.json').write_text(json.dumps(description, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    if not args.skip_zips:
        zip_files(output / 'voz-e-sinais-completo.zip', [(path, path.relative_to(ROOT).as_posix()) for path in selected], 'Voz-e-Sinais/')
        zip_files(output / 'voz-e-sinais-site.zip', [(path, path.relative_to(ROOT / 'site').as_posix()) for path in selected if path.is_relative_to(ROOT / 'site')])
        for name in ['voz-e-sinais-completo.zip', 'voz-e-sinais-site.zip']:
            print(name, (output / name).stat().st_size, 'bytes; SHA256', sha256(output / name))
    print('Arquivos preparados:', len(selected))


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Monta o Java mínimo de assinatura Windows; nunca cria uma chave de usuário."""

import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import struct
import subprocess
import tempfile
import urllib.request
import zipfile


ROOT = Path(__file__).resolve().parents[1]
# O release 21.0.13+9 ainda não publicou binários Windows em 23/10/2026.
# Este é o release Windows 21 mais recente disponível na preparação.
VERSION = '21.0.12.1+1'
ARCHIVE = 'OpenJDK21U-jdk_x64_windows_hotspot_21.0.12.1_1.zip'
BASE_URL = ('https://github.com/adoptium/temurin21-binaries/releases/download/'
            'jdk-21.0.12.1%2B1/')
ARCHIVE_SHA256 = 'f9d6e191ab098c0d416e7d588a24420a8621cd2f4720dab2459b8b7b2d2d8b4e'
MODULES = ('java.base', 'jdk.jartool', 'jdk.crypto.ec')
MANIFEST = 'assinatura-runtime.json'
MAX_FILE_BYTES = 100 * 1024 * 1024


def sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def fetch(name, downloads):
    target = downloads / name
    if target.exists():
        if not target.is_file() or target.is_symlink():
            raise RuntimeError('Cache inválido: ' + str(target))
        return target
    temporary = downloads / (name + '.part')
    if temporary.exists():
        raise RuntimeError('Download parcial já existe; examine-o antes de remover: ' + str(temporary))
    print('Baixando fonte oficial: ' + name, flush=True)
    # urllib valida TLS com as autoridades certificadoras do ambiente. Não há bypass.
    try:
        with urllib.request.urlopen(BASE_URL + name, timeout=120) as response:
            if not response.geturl().startswith('https://'):
                raise RuntimeError('Redirecionamento sem HTTPS rejeitado')
            with temporary.open('xb') as output:
                shutil.copyfileobj(response, output, 1024 * 1024)
        temporary.rename(target)
    except Exception:
        # Somente o arquivo temporário criado por esta execução é removido.
        temporary.unlink(missing_ok=True)
        raise
    return target


def windows_jdk(archive, tools):
    directory = tools / ('signing-windows-jdk-' + VERSION)
    marker = directory / '.archive-sha256'
    if directory.exists():
        if directory.is_symlink() or not marker.is_file() or marker.read_text().strip() != ARCHIVE_SHA256:
            raise RuntimeError('Pasta de ferramentas não reconhecida; preservada: ' + str(directory))
    else:
        with tempfile.TemporaryDirectory(prefix='signing-extract-', dir=tools) as temporary:
            staging = Path(temporary)
            with zipfile.ZipFile(archive) as source:
                for entry in source.infolist():
                    path = PurePosixPath(entry.filename)
                    if (path.is_absolute() or '..' in path.parts or '\\' in entry.filename
                            or (entry.external_attr >> 16) & 0o170000 == 0o120000):
                        raise RuntimeError('Entrada insegura no ZIP oficial')
                source.extractall(staging)
            roots = [p for p in staging.iterdir() if p.is_dir()]
            if len(roots) != 1 or not (roots[0] / 'jmods/java.base.jmod').is_file():
                raise RuntimeError('Estrutura de JDK inesperada no ZIP')
            (roots[0] / '.archive-sha256').write_text(ARCHIVE_SHA256 + '\n', encoding='ascii')
            roots[0].rename(directory)
    # Confere os módulos usados contra o ZIP verificado, inclusive em cache reutilizado.
    with zipfile.ZipFile(archive) as source:
        for module in MODULES:
            suffix = '/jmods/' + module + '.jmod'
            entries = [p for p in source.namelist() if p.endswith(suffix)]
            if len(entries) != 1:
                raise RuntimeError('Módulo ausente no ZIP: ' + module)
            expected = hashlib.sha256(source.read(entries[0])).hexdigest()
            path = directory / 'jmods' / (module + '.jmod')
            if path.is_symlink() or not path.is_file() or sha256(path) != expected:
                raise RuntimeError('Módulo em cache alterado; pasta preservada: ' + str(path))
    return directory


def verify_pe(path):
    with path.open('rb') as source:
        header = source.read(64)
        if len(header) < 64 or header[:2] != b'MZ':
            raise RuntimeError('Binário Windows sem cabeçalho MZ: ' + str(path))
        source.seek(struct.unpack_from('<I', header, 0x3C)[0])
        signature = source.read(6)
        if signature != b'PE\x00\x00\x64\x86':
            raise RuntimeError('Binário não é PE AMD64: ' + str(path))


def verify_runtime(directory, host_jdk):
    for relative in ('bin/java.exe', 'bin/server/jvm.dll'):
        verify_pe(directory / relative)
    listing = subprocess.run([str(host_jdk / 'bin/jimage'), 'list', str(directory / 'lib/modules')],
                             check=True, capture_output=True, text=True).stdout
    for entry in ('sun/security/tools/keytool/Main.class',
                  'sun/security/tools/jarsigner/Main.class'):
        if entry not in listing:
            raise RuntimeError('Classe de assinatura ausente: ' + entry)
    total = 0
    for path in directory.rglob('*'):
        if path.is_symlink():
            raise RuntimeError('Link simbólico não permitido no pacote: ' + str(path))
        if path.is_file():
            size = path.stat().st_size
            if size >= MAX_FILE_BYTES:
                raise RuntimeError('Arquivo excede o limite de distribuição: ' + str(path))
            total += size
    return total


def materialize_links(directory):
    for path in directory.rglob('*'):
        if path.is_symlink():
            resolved = path.resolve(strict=True)
            if not resolved.is_relative_to(directory.resolve()) or not resolved.is_file():
                raise RuntimeError('Link inesperado no runtime: ' + str(path))
            data = resolved.read_bytes()
            path.unlink()
            path.write_bytes(data)


def existing_runtime(output, host_jdk):
    if output.is_symlink() or not (output / MANIFEST).is_file():
        raise RuntimeError('Destino existente não gerenciado; preservado: ' + str(output))
    metadata = json.loads((output / MANIFEST).read_text(encoding='utf-8'))
    if metadata.get('source_sha256') != ARCHIVE_SHA256 or metadata.get('modules') != list(MODULES):
        raise RuntimeError('Runtime existente é de outra versão; mova-o antes de atualizar: ' + str(output))
    files = metadata.get('files', {})
    actual = {p.relative_to(output).as_posix(): sha256(p) for p in output.rglob('*')
              if p.is_file() and p.name != MANIFEST and not p.is_symlink()}
    if not files or files != actual:
        raise RuntimeError('Arquivos do runtime foram alterados; destino preservado: ' + str(output))
    return verify_runtime(output, host_jdk)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--tools-dir', type=Path,
                        default=Path(os.environ.get('VOZ_TOOLS_DIR', '/workspace/.toolchains')))
    parser.add_argument('--host-jdk', type=Path, help='JDK Linux 21 completo, com jlink e jimage')
    parser.add_argument('--output', type=Path,
                        default=ROOT / 'entrega/google-play/assinatura-java')
    args = parser.parse_args()
    tools = args.tools_dir.resolve()
    host_jdk = (args.host_jdk or tools / 'jdk-21.0.13+9').resolve()
    if not all((host_jdk / 'bin' / name).is_file() for name in ('jlink', 'jimage')):
        raise RuntimeError('JDK completo não encontrado: ' + str(host_jdk))
    version = subprocess.run([str(host_jdk / 'bin/jlink'), '--version'], check=True,
                             capture_output=True, text=True).stdout.strip()
    if not re.match(r'^21(?:\.|$)', version):
        raise RuntimeError('Use jlink da mesma versão principal Java 21')
    output = args.output.absolute()
    if output.exists():
        total = existing_runtime(output, host_jdk)
        print(f'Runtime já verificado e preservado: {output} ({total / 1024 / 1024:.1f} MiB)')
        return
    downloads = tools / 'signing-downloads'
    downloads.mkdir(parents=True, exist_ok=True)
    checksum = fetch(ARCHIVE + '.sha256.txt', downloads)
    published = checksum.read_text(encoding='ascii').strip().split()
    if len(published) != 2 or published[0] != ARCHIVE_SHA256 or published[1].lstrip('*') != ARCHIVE:
        raise RuntimeError('Checksum publicado difere da versão fixada; download rejeitado')
    archive = fetch(ARCHIVE, downloads)
    if sha256(archive) != ARCHIVE_SHA256:
        raise RuntimeError('SHA256 do ZIP incorreto; cache preservado para inspeção')
    source_jdk = windows_jdk(archive, tools)
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.assinatura-java-', dir=output.parent) as temporary:
        staging = Path(temporary) / 'runtime'
        subprocess.run([str(host_jdk / 'bin/jlink'), '--module-path', str(source_jdk / 'jmods'),
                        '--add-modules', ','.join(MODULES), '--strip-debug', '--no-header-files',
                        '--no-man-pages', '--compress=zip-6', '--output', str(staging)], check=True)
        materialize_links(staging)
        (staging / 'LEIA-ME-RUNTIME.txt').write_text(
            'Java mínimo de assinatura — Voz e Sinais\n\n'
            'Eclipse Temurin ' + VERSION + ', Windows AMD64. Ferramentas públicas, sem chaves.\n'
            'Os avisos e licenças originais estão na pasta legal.\n'
            'Módulos: ' + ', '.join(MODULES) + '.\n'
            'Binário original: ' + BASE_URL + ARCHIVE + '\n'
            'SHA256 original: ' + ARCHIVE_SHA256 + '\n'
            'Código-fonte correspondente: ' + BASE_URL + 'OpenJDK21U-jdk-sources_21.0.12.1_1.tar.gz\n'
            'Projeto: https://github.com/adoptium/jdk21u\n'
            'O Windows 21.0.13+9 ainda não estava publicado ao preparar este pacote.\n'
            'Preparado com jlink Linux 21. A execução Windows precisa de validação no Windows.\n',
            encoding='utf-8')
        total = verify_runtime(staging, host_jdk)
        metadata = {
            'vendor': 'Eclipse Adoptium', 'version': VERSION, 'platform': 'windows-amd64',
            'source_url': BASE_URL + ARCHIVE, 'source_sha256': ARCHIVE_SHA256,
            'modules': list(MODULES), 'host_jlink_version': version,
            'files': {p.relative_to(staging).as_posix(): sha256(p) for p in sorted(staging.rglob('*'))
                      if p.is_file()},
        }
        (staging / MANIFEST).write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n',
                                      encoding='utf-8')
        # Nunca substitui destino existente, que pode conter arquivos locais do usuário.
        if output.exists():
            raise RuntimeError('Destino surgiu durante a preparação; nenhum arquivo substituído')
        staging.rename(output)
    print(f'Runtime Windows pronto: {output} ({total / 1024 / 1024:.1f} MiB)')
    print('PE AMD64 e classes keytool/jarsigner verificados. Não executado no Windows aqui.')


if __name__ == '__main__':
    main()

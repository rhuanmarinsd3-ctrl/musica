#!/usr/bin/env python3
"""Prepara a fonte oficial e fixada do Whisper.cpp para a compilação JNI local."""
import argparse
import hashlib
import json
import shutil
import tarfile
import tempfile
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = '1.9.5'
COMMIT = 'd1be6fde11ac6e0407606b4e42fe72d34add8037'
URL = 'https://github.com/ggml-org/whisper.cpp/archive/refs/tags/v1.9.5.tar.gz'
SHA256 = 'ff1a9053feb509ff9d7729703355541ae9690073a6b1c40eb692c962e0dc1720'
DESTINATION = ROOT / 'app/src/main/cpp/third_party/whisper'
INCLUDE = ['CMakeLists.txt', 'LICENSE', 'cmake', 'include', 'src',
           'ggml/CMakeLists.txt', 'ggml/cmake', 'ggml/include', 'ggml/src']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-only', action='store_true', help='Compatibilidade: esta preparação não baixa modelos')
    parser.add_argument('--archive', type=Path, help='Arquivo oficial já baixado (SHA256 fixado será conferido)')
    args = parser.parse_args()
    marker = DESTINATION / 'SOURCE.json'
    if DESTINATION.exists():
        if marker.is_file() and json.loads(marker.read_text()).get('sha256') == SHA256:
            print('Fonte Whisper.cpp 1.9.5 já preparada.')
            return
        raise SystemExit('Diretório existente sem a identificação esperada; preservado sem alterações.')
    DESTINATION.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='whisper-source-', dir=DESTINATION.parent) as directory:
        work = Path(directory)
        archive = args.archive
        if archive is None:
            archive = work / 'whisper.tar.gz'
            print('Obtendo fonte oficial por HTTPS:', URL, flush=True)
            with urllib.request.urlopen(URL, timeout=120) as response, archive.open('wb') as output:
                shutil.copyfileobj(response, output)
        with archive.open('rb') as source:
            if hashlib.file_digest(source, 'sha256').hexdigest() != SHA256:
                raise SystemExit('Fonte rejeitada: SHA256 não corresponde à versão fixada.')
        with tarfile.open(archive) as source:
            source.extractall(work, filter='data')
        unpacked = work / ('whisper.cpp-' + VERSION)
        prepared = work / 'prepared'
        prepared.mkdir()
        for relative in INCLUDE:
            path = unpacked / relative
            destination = prepared / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            if path.is_dir():
                shutil.copytree(path, destination)
            elif path.is_file():
                shutil.copyfile(path, destination)
            else:
                raise RuntimeError('Fonte oficial sem arquivo requerido: ' + relative)
        (prepared / 'SOURCE.json').write_text(json.dumps({
            'project': 'whisper.cpp', 'version': VERSION, 'commit': COMMIT,
            'url': URL, 'sha256': SHA256, 'license': 'MIT',
            'note': 'Subset não modificado de fontes e arquivos CMake da distribuição oficial.'
        }, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        prepared.rename(DESTINATION)
        print('Fonte Whisper.cpp preparada e verificada. Modelo é preparado separadamente.')


if __name__ == '__main__':
    main()

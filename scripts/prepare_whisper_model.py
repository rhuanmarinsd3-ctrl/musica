#!/usr/bin/env python3
"""Prepara o modelo Whisper Tiny multilíngue da fonte oficial, com hash fixado."""
import argparse
import hashlib
import shutil
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
URL = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin'
# OID SHA256 publicado no ponteiro LFS do repositório oficial ggerganov/whisper.cpp.
SHA256 = 'be07e048e1e599ad46341c8d2a135645097a538221678b7acdd1b1919c6e1b21'
SIZE = 77691713
DEST = ROOT / 'app/src/bundled/assets/whisper/ggml-tiny.bin'


def verify(path):
    if path.stat().st_size != SIZE:
        raise ValueError('Tamanho do modelo incorreto; arquivo não utilizado.')
    with path.open('rb') as source:
        actual = hashlib.file_digest(source, 'sha256').hexdigest()
    if actual != SHA256:
        raise ValueError('SHA256 do modelo incorreto; arquivo não utilizado.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', type=Path, help='Arquivo ggml-tiny.bin previamente obtido, sujeito ao mesmo SHA256')
    args = parser.parse_args()
    DEST.parent.mkdir(parents=True, exist_ok=True)
    if DEST.exists():
        verify(DEST)
    else:
        source = args.archive
        temporary = DEST.with_suffix('.bin.part')
        try:
            if source:
                verify(source)
                shutil.copyfile(source, temporary)
            else:
                with urllib.request.urlopen(URL, timeout=180) as response, temporary.open('wb') as target:
                    shutil.copyfileobj(response, target)
            verify(temporary)
            temporary.rename(DEST)
        finally:
            if temporary.exists():
                temporary.unlink()
    DEST.with_suffix('.bin.sha256').write_text(SHA256 + '\n', encoding='ascii')
    print('Modelo Whisper Tiny multilíngue verificado:', SIZE, 'bytes; SHA256', SHA256)


if __name__ == '__main__':
    main()

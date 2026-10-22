#!/usr/bin/env python3
"""Obtém o modelo português da fonte oficial, sem desligar TLS nem mudar seu conteúdo."""
import argparse
import hashlib
import json
import shutil
import stat
import tempfile
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'app/src/bundled/assets/model-pt-br'
URL = 'https://alphacephei.com/vosk/models/vosk-model-small-pt-0.3.zip'
MODEL = 'vosk-model-small-pt-0.3'
EXPECTED_SHA256 = '6e1ce909032e1afa7a88e68a3d628ecafff302bdf195befab308826c395e93b7'


def validate(root):
    # Vosk officially supports both layouts. Portuguese 0.3 uses the original one.
    legacy = (root / 'final.mdl').is_file()
    for part in (('final.mdl', 'mfcc.conf') if legacy else ('am/final.mdl', 'conf/model.conf')):
        if not (root / part).is_file():
            raise ValueError('Modelo incompleto: ' + part)
    graph = root if legacy else root / 'graph'
    if not ((graph / 'HCLG.fst').is_file() or
            ((graph / 'HCLr.fst').is_file() and (graph / 'Gr.fst').is_file())):
        raise ValueError('Grafo de reconhecimento ausente')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', type=Path, help='ZIP já obtido da fonte oficial')
    parser.add_argument('--sha256', help='SHA256 esperado para verificar o ZIP local ou remoto')
    args = parser.parse_args()
    if args.sha256 and args.sha256.lower() != EXPECTED_SHA256:
        parser.error('--sha256 deve corresponder ao hash fixado do modelo oficial')
    if DEST.exists():
        validate(DEST)
        if not (DEST / 'uuid').is_file() or not (DEST / 'source.json').is_file():
            raise SystemExit('Diretório existente não foi criado por este script; preservado sem alterações.')
        print('Modelo local já preparado; nenhum arquivo alterado.')
        return
    DEST.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='vosk-', dir=DEST.parent) as directory:
        work = Path(directory)
        archive = args.archive
        if archive is None:
            archive = work / 'model.zip'
            print('Baixando por HTTPS da fonte oficial:', URL, flush=True)
            with urllib.request.urlopen(URL, timeout=120) as response, archive.open('wb') as target:
                shutil.copyfileobj(response, target)
        digest = hashlib.file_digest(archive.open('rb'), 'sha256').hexdigest()
        if digest != EXPECTED_SHA256:
            raise SystemExit('SHA256 incorreto; modelo rejeitado e não instalado.')
        with zipfile.ZipFile(archive) as z:
            if sum(x.file_size for x in z.infolist()) > 500 * 1024 * 1024:
                raise ValueError('Arquivo excede tamanho esperado para o modelo pequeno')
            for entry in z.infolist():
                parts = Path(entry.filename).parts
                if (not parts or parts[0] != MODEL or '..' in parts or
                        Path(entry.filename).is_absolute() or
                        stat.S_ISLNK(entry.external_attr >> 16)):
                    raise ValueError('Caminho inválido no ZIP: ' + entry.filename)
            z.extractall(work)
        prepared = work / MODEL
        validate(prepared)
        (prepared / 'uuid').write_text(digest + '\n', encoding='utf-8')
        (prepared / 'source.json').write_text(json.dumps({
            'model': MODEL, 'source': URL, 'sha256': digest,
            'license': 'Apache-2.0',
            'note': 'Hash fixado após obtenção da fonte oficial por HTTPS verificado; o fornecedor não publica checksum separado.'
        }, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        prepared.rename(DEST)
        print('Modelo preparado. SHA256:', digest)


if __name__ == '__main__':
    main()

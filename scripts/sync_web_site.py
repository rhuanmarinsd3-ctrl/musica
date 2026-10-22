#!/usr/bin/env python3
"""Copia a interface web para o site sem sobrescrever alterações locais."""
import hashlib
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'app/src/main/assets/web'
DESTINATION = ROOT / 'site/app'
STATE_NAME = '.source-sync.json'


def digest(path):
    with path.open('rb') as content:
        return hashlib.file_digest(content, 'sha256').hexdigest()


def main():
    if not SOURCE.is_dir() or SOURCE.is_symlink():
        raise SystemExit('Interface de origem não encontrada ou caminho simbólico não permitido.')
    if DESTINATION.is_symlink():
        raise SystemExit('Destino simbólico preservado; não foi feita nenhuma alteração.')

    state_file = DESTINATION / STATE_NAME
    previous = {}
    if state_file.exists():
        if state_file.is_symlink():
            raise SystemExit('Manifesto simbólico preservado; nenhuma alteração.')
        state = json.loads(state_file.read_text(encoding='utf-8'))
        if state.get('version') != 1 or not isinstance(state.get('files'), dict):
            raise SystemExit('Manifesto existente não reconhecido; nenhuma alteração.')
        previous = state['files']

    planned = []
    current = {}
    for source in sorted(SOURCE.rglob('*')):
        if source.is_symlink():
            raise SystemExit('Origem simbólica não permitida: ' + str(source))
        if not source.is_file():
            continue
        relative = source.relative_to(SOURCE)
        if relative.as_posix() == STATE_NAME:
            raise SystemExit('Nome reservado encontrado na origem.')
        destination = DESTINATION / relative
        for component in [destination, *destination.parents]:
            if component == DESTINATION.parent:
                break
            if component.is_symlink():
                raise SystemExit('Destino simbólico preservado: ' + str(component))
        expected = digest(source)
        key = relative.as_posix()
        current[key] = expected
        if destination.exists():
            if not destination.is_file():
                raise SystemExit('Destino existente não é um arquivo; preservado: ' + str(destination))
            actual = digest(destination)
            if actual == expected:
                continue
            if actual != previous.get(key):
                raise SystemExit('Arquivo local alterado foi preservado: ' + str(destination)
                                 + '\nRevise esse arquivo antes de executar a sincronização novamente.')
        planned.append((source, destination))

    # Todos os conflitos são checados antes de modificar o destino.
    if not DESTINATION.exists():
        DESTINATION.mkdir(parents=True, mode=0o755)
        DESTINATION.chmod(0o755)
    for source, destination in planned:
        missing = []
        parent = destination.parent
        while not parent.exists():
            missing.append(parent)
            parent = parent.parent
        for directory in reversed(missing):
            directory.mkdir(mode=0o755)
            directory.chmod(0o755)
        shutil.copyfile(source, destination)
        destination.chmod(0o644)

    # Arquivos extras ou retirados da origem são preservados, nunca apagados.
    merged = {**previous, **current}
    state_text = json.dumps({'version': 1, 'files': merged}, indent=2, sort_keys=True) + '\n'
    if not state_file.exists() or state_file.read_text(encoding='utf-8') != state_text:
        state_file.write_text(state_text, encoding='utf-8')
        state_file.chmod(0o644)
    print(f'Interface do site sincronizada: {len(current)} arquivos, {len(planned)} atualizados.')
    print('Cartões e escrita estão disponíveis na web; transcrição offline requer o aplicativo Android.')


if __name__ == '__main__':
    main()

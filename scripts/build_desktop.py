#!/usr/bin/env python3
"""Gera aplicativos portáteis reais, com Electron e Whisper locais e hashes fixados."""
import argparse
import hashlib
import json
import os
import shutil
import subprocess
import tarfile
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOOLS = Path(os.environ.get('VOZ_TOOLS_DIR', '/workspace/.toolchains'))
CACHE = TOOLS / 'desktop-downloads'
ELECTRON_VERSION = '45.0.0'
ELECTRON = {
    'linux': ('linux-x64', '22f6a10bd3f7fef987ddbb379d3375ce664ad0c98a9a50f80c89f1718a0c3e3a'),
    'windows': ('win32-x64', 'ae53887a23bb640369c93dbd38c408a2af5c0deb86f2fa76c6c244cb444b7f47'),
}
MODEL_SHA256 = 'be07e048e1e599ad46341c8d2a135645097a538221678b7acdd1b1919c6e1b21'
MINGW_NAME = 'llvm-mingw-20261020-ucrt-ubuntu-22.04-x86_64'
MINGW_SHA256 = '55064b60b991a1e1e8090b8c2f84e82b22cfe5903d12c159d65064cf5e8ae335'


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def download(name, url, expected):
    CACHE.mkdir(parents=True, exist_ok=True)
    target = CACHE / name
    if not target.is_file():
        temporary = target.with_suffix(target.suffix + '.part')
        print('Obtendo fonte oficial:', name, flush=True)
        with urllib.request.urlopen(url, timeout=120) as source, temporary.open('wb') as out:
            shutil.copyfileobj(source, out)
        temporary.rename(target)
    if digest(target) != expected:
        raise RuntimeError('Checksum incorreto; arquivo não será usado: ' + name)
    return target


def unzip(source, target):
    with zipfile.ZipFile(source) as archive:
        for info in archive.infolist():
            if Path(info.filename).is_absolute() or '..' in Path(info.filename).parts:
                raise RuntimeError('Caminho inválido no ZIP oficial')
        archive.extractall(target)
        for info in archive.infolist():
            if not info.is_dir():
                (target / info.filename).chmod(0o755 if ((info.external_attr >> 16) & 0o111) else 0o644)


def copy(source, target):
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, target)
    target.chmod(0o755 if source.name in ['whisper-cli', 'gradlew'] else 0o644)


def engine(platform):
    source = TOOLS / 'whisper.cpp-1.9.5'
    cmake = TOOLS / 'android-sdk/cmake/3.22.1/bin/cmake'
    ninja = cmake.with_name('ninja')
    if not source.is_dir():
        archive = download('whisper.cpp-1.9.5.tar.gz',
            'https://github.com/ggml-org/whisper.cpp/archive/refs/tags/v1.9.5.tar.gz',
            'ff1a9053feb509ff9d7729703355541ae9690073a6b1c40eb692c962e0dc1720')
        with tarfile.open(archive) as original:
            original.extractall(TOOLS, filter='data')
    if not cmake.is_file():
        raise RuntimeError('Prepare CMake 3.22.1 com scripts/cloud_setup.py antes de compilar o desktop.')
    build = TOOLS / ('whisper-windows-build' if platform == 'windows' else 'whisper-host-build')
    binary = build / 'bin' / ('whisper-cli.exe' if platform == 'windows' else 'whisper-cli')
    if binary.is_file():
        return binary
    args = [str(cmake), '-S', str(source), '-B', str(build), '-G', 'Ninja',
            '-DCMAKE_MAKE_PROGRAM=' + str(ninja), '-DCMAKE_BUILD_TYPE=Release',
            '-DBUILD_SHARED_LIBS=OFF', '-DGGML_NATIVE=OFF', '-DGGML_OPENMP=OFF',
            '-DGGML_SSE42=OFF', '-DGGML_BMI2=OFF', '-DGGML_AVX=OFF', '-DGGML_AVX2=OFF',
            '-DGGML_FMA=OFF', '-DGGML_F16C=OFF', '-DWHISPER_BUILD_TESTS=OFF', '-DWHISPER_BUILD_SERVER=OFF']
    environment = dict(os.environ)
    if platform == 'windows':
        mingw = TOOLS / MINGW_NAME
        if not mingw.is_dir():
            archive = download(MINGW_NAME + '.tar.xz',
                'https://github.com/mstorsjo/llvm-mingw/releases/download/20261020/' + MINGW_NAME + '.tar.xz', MINGW_SHA256)
            with tarfile.open(archive) as t:
                t.extractall(TOOLS, filter='data')
        environment['VOZ_MINGW_ROOT'] = str(mingw)
        args += ['-DCMAKE_TOOLCHAIN_FILE=' + str(ROOT / 'desktop/mingw-toolchain.cmake')]
    subprocess.run(args, env=environment, check=True)
    subprocess.run([str(cmake), '--build', str(build), '--target', 'whisper-cli', '--parallel', '2'], check=True)
    if not binary.is_file():
        raise RuntimeError('Whisper CLI não foi produzido')
    return binary


def make_package(platform, archives):
    model = ROOT / 'app/src/bundled/assets/whisper/ggml-tiny.bin'
    if not model.is_file() or digest(model) != MODEL_SHA256:
        raise RuntimeError('Prepare o modelo tiny oficial com scripts/prepare_whisper_model.py.')
    platform_name, checksum = ELECTRON[platform]
    name = 'electron-v' + ELECTRON_VERSION + '-' + platform_name + '.zip'
    archive = download(name, 'https://github.com/electron/electron/releases/download/v' + ELECTRON_VERSION + '/' + name, checksum)
    target = ROOT / 'dist/pc' / ('Voz-e-Sinais-Windows-x64' if platform == 'windows' else 'Voz-e-Sinais-Linux-x64')
    # This directory is exclusively generated output, never a source directory.
    if target.exists():
        shutil.rmtree(target)
    target.mkdir(parents=True)
    unzip(archive, target)
    original = target / ('electron.exe' if platform == 'windows' else 'electron')
    executable = target / ('Voz e Sinais.exe' if platform == 'windows' else 'voz-e-sinais')
    original.rename(executable)
    executable.chmod(0o755)
    appdir = target / 'resources/app'
    appdir.mkdir(parents=True)
    for name in ['main.js', 'desktop-events.js', 'speak-windows.ps1']:
        copy(ROOT / 'desktop' / name, appdir / name)
    config = json.loads((ROOT / 'desktop/package.json').read_text())
    config.pop('devDependencies', None)
    config.pop('scripts', None)
    (appdir / 'package.json').write_text(json.dumps(config, ensure_ascii=False, indent=2) + '\n')
    (appdir / 'preload-bundle.js').write_text((ROOT / 'desktop/audio.js').read_text() + '\n' + (ROOT / 'desktop/preload.js').read_text())
    for path in (ROOT / 'app/src/main/assets/web').rglob('*'):
        if path.is_file():
            copy(path, appdir / 'ui' / path.relative_to(ROOT / 'app/src/main/assets/web'))
    index = appdir / 'ui/index.html'
    html = index.read_text()
    html = html.replace('<script src="app.js" defer></script>', '<script src="app.js" defer></script>\n  <script src="desktop-events.js" defer></script>')
    html = html.replace('O áudio é processado no aparelho e não é gravado.', 'O áudio fica neste computador e é apagado após o processamento.')
    index.write_text(html)
    copy(ROOT / 'desktop/desktop-events.js', appdir / 'ui/desktop-events.js')
    copy(engine(platform), appdir / 'runtime' / ('whisper-cli.exe' if platform == 'windows' else 'whisper-cli'))
    copy(model, appdir / 'runtime/ggml-tiny.bin')
    copy(TOOLS / 'whisper.cpp-1.9.5/LICENSE', appdir / 'licenses/WHISPER-LICENSE.txt')
    copy(ROOT / 'app/src/bundled/assets/whisper/MODEL-LICENSE.txt', appdir / 'licenses/MODEL-LICENSE.txt')
    copy(ROOT / 'THIRD_PARTY_NOTICES.md', appdir / 'licenses/PROJECT-NOTICES.md')
    guide = ('VOZ E SINAIS PARA COMPUTADOR\n\n'
        + ('Windows 10/11 de 64 bits. Extraia todo o ZIP e abra "Voz e Sinais.exe".\n' if platform == 'windows' else 'Linux x86_64. Extraia todo o ZIP e execute ./voz-e-sinais.\n')
        + 'Mantenha a pasta resources e os outros arquivos junto ao aplicativo.\n'
        + 'O app abre diretamente, sem navegador, site ou servidor.\n'
        + 'O reconhecimento usa o modelo de português incluído, sem internet.\n'
        + 'O texto aparece por trechos de aproximadamente 10 segundos.\n'
        + 'Para falar, use uma voz pt-BR offline instalada no sistema.\n'
        + 'Frases e cartões pessoais ficam neste computador.\n'
        + 'Áudio temporário é apagado depois da transcrição e ao sair.\n'
        + 'Confira o texto transcrito, pois o reconhecimento pode errar.\n'
        + 'Leia as limitações de Libras no próprio aplicativo.\n'
        + 'Distribuição Windows sem certificado de assinatura de código; não foi executada no Windows neste ambiente Linux.\n')
    (target / 'LEIA-ME.txt').write_text(guide, encoding='utf-8')
    report = {'platform': platform, 'electron': ELECTRON_VERSION, 'whisper': '1.9.5', 'model_sha256': MODEL_SHA256,
              'whisper_cli_sha256': digest(appdir / 'runtime' / ('whisper-cli.exe' if platform == 'windows' else 'whisper-cli')),
              'windows_runtime_validation': 'cross-compiled; not executed on Windows' if platform == 'windows' else None}
    (target / 'VERSAO.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    if archives:
        output = target.with_suffix('.zip')
        with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as z:
            for path in sorted(target.rglob('*')):
                if not path.is_file():
                    continue
                name = target.name + '/' + path.relative_to(target).as_posix()
                info = zipfile.ZipInfo(name)
                info.create_system = 3
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = (0o100755 if path.stat().st_mode & 0o111 else 0o100644) << 16
                with path.open('rb') as source, z.open(info, 'w', force_zip64=True) as out:
                    shutil.copyfileobj(source, out)
        with zipfile.ZipFile(output) as z:
            if z.testzip():
                raise RuntimeError('Falha de integridade no ZIP desktop')
        output.with_suffix('.zip.sha256').write_text(digest(output) + '  ' + output.name + '\n')
        print('Pacote verificado:', output, output.stat().st_size, 'bytes', flush=True)
    else:
        print('Aplicativo preparado:', target, flush=True)
    return target


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--platform', choices=['all', 'windows', 'linux'], default='all')
    parser.add_argument('--skip-zips', action='store_true')
    args = parser.parse_args()
    for platform in (['linux', 'windows'] if args.platform == 'all' else [args.platform]):
        make_package(platform, not args.skip_zips)


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Prepara ferramentas Android no workspace, com TLS e checksums oficiais preservados."""
import hashlib
import os
import shutil
import subprocess
import tarfile
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOOLS = Path(os.environ.get('VOZ_TOOLS_DIR', '/workspace/.toolchains'))
DOWNLOADS = TOOLS / 'downloads'
JDK = TOOLS / 'jdk-21.0.13+9'
SDK = TOOLS / 'android-sdk'


def download(name, url, algorithm, checksum):
    target = DOWNLOADS / name
    if not target.exists():
        temporary = target.with_suffix(target.suffix + '.part')
        print('Obtendo', name, flush=True)
        with urllib.request.urlopen(url, timeout=120) as response, temporary.open('wb') as output:
            shutil.copyfileobj(response, output)
        temporary.rename(target)
    with target.open('rb') as source:
        actual = hashlib.file_digest(source, algorithm).hexdigest()
    if actual != checksum:
        raise RuntimeError('Checksum incorreto; artefato rejeitado: ' + str(target))
    return target


def unzip(archive, directory):
    with zipfile.ZipFile(archive) as z:
        for entry in z.infolist():
            path = Path(entry.filename)
            if path.is_absolute() or '..' in path.parts:
                raise ValueError('Caminho inválido no ZIP')
        z.extractall(directory)
        for entry in z.infolist():
            mode = entry.external_attr >> 16
            if mode and not entry.is_dir():
                (directory / entry.filename).chmod(mode & 0o777)


def main():
    DOWNLOADS.mkdir(parents=True, exist_ok=True)
    if not (JDK / 'bin/javac').is_file():
        archive = download('jdk-21.tar.gz',
            'https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.13%2B9/OpenJDK21U-jdk_x64_linux_hotspot_21.0.13_9.tar.gz',
            'sha256', 'd7f5d5cf865a2902b70ff549b97586a7d3f234e016f041ab447ea740c7d66d1c')
        with tarfile.open(archive) as t:
            t.extractall(TOOLS, filter='data')
    # Confia na CA fornecida por este ambiente sem remover as raízes existentes.
    cert = os.environ.get('CODEX_PROXY_CERT')
    if cert and Path(cert).is_file():
        args = [str(JDK / 'bin/keytool'), '-keystore', str(JDK / 'lib/security/cacerts'),
                '-storepass', 'changeit', '-alias', 'voz-environment-proxy-ca']
        exists = subprocess.run(args + ['-list'], stdout=subprocess.DEVNULL,
                                stderr=subprocess.DEVNULL).returncode == 0
        if not exists:
            subprocess.run(args + ['-importcert', '-noprompt', '-file', cert], check=True,
                           stdout=subprocess.DEVNULL)
    manager = SDK / 'cmdline-tools/19.0/bin/sdkmanager'
    if not manager.is_file():
        archive = download('android-tools.zip',
            'https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip',
            'sha1', '5fdcc763663eefb86a5b8879697aa6088b041e70')
        staging = TOOLS / 'android-tools-staging'
        staging.mkdir(exist_ok=True)
        unzip(archive, staging)
        manager.parent.parent.parent.mkdir(parents=True, exist_ok=True)
        (staging / 'cmdline-tools').rename(manager.parent.parent)
    manager.chmod(0o755)
    properties = TOOLS / 'gradle-cache/gradle.properties'
    properties.parent.mkdir(parents=True, exist_ok=True)
    proxy_lines = []
    for scheme in ('http', 'https'):
        proxy = urllib.parse.urlsplit(os.environ.get(scheme.upper() + '_PROXY', ''))
        if proxy.hostname and proxy.port:
            if proxy.username or proxy.password:
                raise RuntimeError('Proxy autenticado exige configuração segura própria; nenhuma credencial foi gravada.')
            proxy_lines.extend(['systemProp.' + scheme + '.proxyHost=' + proxy.hostname,
                                'systemProp.' + scheme + '.proxyPort=' + str(proxy.port)])
    # Arquivo local gerenciado pelo setup, fora do repositório. Não contém segredos.
    properties.write_text('\n'.join(proxy_lines) + '\n', encoding='utf-8')
    environment = dict(os.environ, JAVA_HOME=str(JDK), ANDROID_HOME=str(SDK),
                       ANDROID_USER_HOME=str(TOOLS / '.android'), ANDROID_SDK_HOME=str(TOOLS),
                       GRADLE_USER_HOME=str(properties.parent))
    (TOOLS / '.android').mkdir(exist_ok=True)
    if not ((SDK / 'platforms/android-36/android.jar').is_file() and
            (SDK / 'build-tools/36.0.0/aapt2').is_file() and
            (SDK / 'platform-tools/adb').is_file() and
            (SDK / 'ndk/28.2.13676358/ndk-build').is_file() and
            (SDK / 'cmake/3.22.1/bin/cmake').is_file()):
        result = subprocess.run([str(manager), '--sdk_root=' + str(SDK),
            'platforms;android-36', 'build-tools;36.0.0', 'platform-tools',
            'ndk;28.2.13676358', 'cmake;3.22.1'],
            input='y\n' * 100, capture_output=True, text=True, env=environment)
        if result.returncode:
            raise RuntimeError('SDK não instalado: ' + result.stderr[-3000:])
    local = ROOT / 'local.properties'
    if not local.exists():
        local.write_text('sdk.dir=' + str(SDK) + '\n', encoding='utf-8')
    print('Ferramentas preparadas. Ative com: . scripts/cloud-env.sh')
    print('Prepare o Whisper com scripts/prepare_whisper.py e scripts/prepare_whisper_model.py.')


if __name__ == '__main__':
    main()

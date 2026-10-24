#!/usr/bin/env python3
"""Evaluate an actual Whisper CLI with fixed Portuguese speech fixtures.

Exit 0 means all smoke criteria passed, 1 means recognition/accuracy failed,
and 2 means the requested engine/model/fixtures could not run.
This is a development check, never a claim of universal transcription accuracy.
"""
import argparse
import hashlib
import json
import re
import subprocess
import sys
import tempfile
import time
import unicodedata
import wave
from pathlib import Path


def words(text):
    plain = ''.join(ch for ch in unicodedata.normalize('NFD', text.lower())
                    if unicodedata.category(ch) != 'Mn')
    return re.findall(r'[a-z0-9]+', plain)


def distance(left, right):
    row = list(range(len(right) + 1))
    for i, expected in enumerate(left, 1):
        new = [i]
        for j, actual in enumerate(right, 1):
            new.append(min(new[-1] + 1, row[j] + 1, row[j - 1] + (expected != actual)))
        row = new
    return row[-1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--engine', required=True, type=Path)
    parser.add_argument('--model', required=True, type=Path)
    parser.add_argument('--fixtures', required=True, type=Path)
    parser.add_argument('--report', required=True, type=Path)
    parser.add_argument('--decoder', choices=('cli-default', 'android-greedy'), default='cli-default',
                        help='Preserve CLI defaults or match the Android greedy decoding flags')
    args = parser.parse_args()
    for path in (args.engine, args.model, args.fixtures / 'manifest.json'):
        if not path.is_file():
            print('Prerequisite absent: ' + str(path), file=sys.stderr)
            return 2
    source = json.loads((args.fixtures / 'manifest.json').read_text())
    with args.engine.open('rb') as stream:
        engine_hash = hashlib.file_digest(stream, 'sha256').hexdigest()
    with args.model.open('rb') as stream:
        model_hash = hashlib.file_digest(stream, 'sha256').hexdigest()
    decoder_flags = [] if args.decoder == 'cli-default' else ['-bs', '1', '-nf', '-nfa', '-sns']
    report = {'engine': str(args.engine.resolve()), 'engine_sha256': engine_hash,
              'model': str(args.model.resolve()), 'model_sha256': model_hash,
              'decoder': args.decoder, 'extra_decoder_flags': decoder_flags,
              'source': source['source'], 'preparation': source['preparation'],
              'limitation': source['limitation'],
              'max_word_error_rate': source['maxWordErrorRate'], 'cases': []}
    with tempfile.TemporaryDirectory(prefix='voz-whisper-qa-') as directory:
        for case in source['cases']:
            wav = args.fixtures / case['file']
            with wave.open(str(wav), 'rb') as stream:
                if (stream.getnchannels(), stream.getsampwidth(), stream.getframerate()) != (1, 2, 16000):
                    raise ValueError('Fixture must be PCM16 mono 16kHz: ' + str(wav))
                duration = stream.getnframes() / stream.getframerate()
            prefix = Path(directory) / case['id']
            command = [str(args.engine.resolve()), '-m', str(args.model.resolve()),
                       '-f', str(wav.resolve()), '-l', 'pt', '-t', '2', '-ng', '-np', '-oj', '-of', str(prefix), '-nt']
            command.extend(decoder_flags)
            started = time.monotonic()
            try:
                result = subprocess.run(command, capture_output=True, text=True, timeout=120)
            except subprocess.TimeoutExpired:
                result = subprocess.CompletedProcess(command, 124, '', 'Recognition timed out after 120 seconds.')
            elapsed = time.monotonic() - started
            json_file = prefix.with_suffix('.json')
            actual = ''
            error = ''
            if result.returncode == 0 and json_file.is_file():
                payload = json.loads(json_file.read_text())
                actual = ' '.join(part.get('text', '') for part in payload.get('transcription', [])).strip()
            else:
                error = result.stderr[-2000:]
            reference_words, actual_words = words(case['expected']), words(actual)
            errors = distance(reference_words, actual_words)
            rate = errors / max(1, len(reference_words))
            minimum_counts = {token: 1 for token in case['required']}
            minimum_counts.update(case.get('requiredWordCounts', {}))
            content_preserved = all(actual_words.count(token) >= count for token, count in minimum_counts.items())
            passed = result.returncode == 0 and content_preserved and rate <= source['maxWordErrorRate']
            report['cases'].append({'id': case['id'], 'duration_seconds': round(duration, 3),
                'decode_seconds': round(elapsed, 3), 'real_time_factor': round(elapsed / max(duration, 0.001), 3),
                'expected': case['expected'], 'actual': actual, 'exact_match': reference_words == actual_words,
                'word_error_rate': round(rate, 3), 'required_words': case['required'],
                'required_word_counts': minimum_counts,
                'required_words_preserved': content_preserved, 'command_exit': result.returncode,
                'passed': passed, 'error': error})
            print(case['id'] + ': ' + ('PASS' if passed else 'FAIL') +
                  ' WER=' + str(round(rate, 3)) + ' actual=' + repr(actual), flush=True)
            args.report.parent.mkdir(parents=True, exist_ok=True)
            args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    report['exact_matches'] = sum(case['exact_match'] for case in report['cases'])
    report['passed_cases'] = sum(case['passed'] for case in report['cases'])
    report['total_cases'] = len(report['cases'])
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report['passed_cases'] == report['total_cases'] else 1


if __name__ == '__main__':
    sys.exit(main())

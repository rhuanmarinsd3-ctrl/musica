# Portuguese human speech fixtures

Three preselected Google FLEURS `pt_br` development recordings, licensed under [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/).

Attribution: Alexis Conneau, Min Ma, Simran Khanuja, Yu Zhang, Vera Axelrod, Siddharth Dalmia, Jason Riesa, Clara Rivera, Ankur Bapna (2022), [FLEURS: Few-shot Learning Evaluation of Universal Representations of Speech](https://arxiv.org/abs/2205.12446).

The official audio was converted to PCM16 mono/16 kHz, without trimming, padding, speed changes, or reference-text edits. `provenance.json` records original filenames, pinned source revision, SHA256 hashes and selection before recognition. `manifest.json` contains the fixed WER limit (0.34), official references and required semantic words. The third clip requires two occurrences of the negation “não”.

These three read-speech examples are all labeled MALE by the source. They do not establish accuracy across ages, genders, accents, hearing conditions, natural conversations, physical microphones or target devices. They are development fixtures, outside application release assets.

Run from the repository root:

```sh
python3 tests/check-offline-recognition.py --engine /path/to/whisper-cli --model /path/to/ggml-base.bin --fixtures tests/speech-fixtures/fleurs-pt-br --report test-results/whisper-human-quality.json
```

Add `--decoder android-greedy` to mirror the JNI decoding flags in the host CLI. This still does not validate the JNI integration or Android microphone.

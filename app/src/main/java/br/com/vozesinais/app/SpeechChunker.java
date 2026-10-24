package br.com.vozesinais.app;

import java.util.Arrays;

/** Bounded PCM utterances with a little lead-in and silence gating; not emotion detection. */
final class SpeechChunker {
    static final int RATE = 16000;
    private static final int MAX_SAMPLES = RATE * 10;
    private static final int MIN_VOICED_SAMPLES = RATE * 8 / 100;
    private static final int SILENCE_END_SAMPLES = RATE * 3 / 4;
    private static final int LEAD_SAMPLES = RATE / 2;
    private static final int TRAIL_SAMPLES = RATE / 4;
    private final short[] samples = new short[MAX_SAMPLES + 4000];
    private int length;
    private int voicedSamples;
    private int silenceSamples;
    private int lastVoiced;

    float[] accept(short[] input, int count) {
        if (count < 0 || count > input.length || count > 4000) {
            throw new IllegalArgumentException("Invalid PCM frame length");
        }
        if (count == 0) return null;
        long energy = 0;
        int peak = 0;
        for (int i = 0; i < count; i++) {
            int sample = input[i];
            energy += (long) sample * sample;
            peak = Math.max(peak, Math.abs(sample));
        }
        double rms = Math.sqrt((double) energy / count) / 32768.0;
        boolean speech = rms >= 0.006 && peak >= 650;
        System.arraycopy(input, 0, samples, length, count);
        length += count;
        if (speech) {
            voicedSamples += count;
            lastVoiced = length;
            silenceSamples = 0;
        } else {
            silenceSamples += count;
        }
        if (voicedSamples == 0 && length > LEAD_SAMPLES * 2) {
            System.arraycopy(samples, length - LEAD_SAMPLES, samples, 0, LEAD_SAMPLES);
            length = LEAD_SAMPLES;
            silenceSamples = length;
        }
        if ((voicedSamples >= MIN_VOICED_SAMPLES && silenceSamples >= SILENCE_END_SAMPLES)
                || length >= MAX_SAMPLES) {
            return finish();
        }
        return null;
    }

    float[] finish() {
        float[] result = null;
        if (voicedSamples >= MIN_VOICED_SAMPLES) {
            // Whisper needs context around brief replies such as "sim" and "não".
            int contentSize = Math.min(length, lastVoiced + TRAIL_SAMPLES);
            int size = Math.max(RATE, contentSize);
            result = new float[size];
            for (int i = 0; i < contentSize; i++) result[i] = samples[i] / 32768.0f;
        }
        Arrays.fill(samples, 0, length, (short) 0);
        length = 0;
        voicedSamples = 0;
        silenceSamples = 0;
        lastVoiced = 0;
        return result;
    }
}

package br.com.vozesinais.app;

import android.app.Activity;
import android.app.Instrumentation;
import android.os.Bundle;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.Locale;

/** Runs the packaged JNI engine with synthetic pt-BR fixtures, not a simulated Java bridge. */
public final class WhisperSmokeInstrumentation extends Instrumentation {
    @Override public void onCreate(Bundle arguments) {
        super.onCreate(arguments);
        start();
    }

    @Override public void onStart() {
        Bundle result = new Bundle();
        long started = System.currentTimeMillis();
        try {
            File file = prepareModel();
            JSONArray cases = new JSONArray();
            boolean passed = true;
            try (OfflineWhisper engine = new OfflineWhisper(file)) {
                progress("model_loaded");
                engine.beginSession();
                String silence = engine.transcribe(new float[16000]);
                boolean silencePassed = silence.trim().isEmpty();
                passed &= silencePassed;
                cases.put(new JSONObject().put("case", "silence").put("actual", silence).put("passed", silencePassed));
                String[] names = {"food", "negation"};
                String[][] words = {{"comida", "gentileza"}, {"nao", "triste"}};
                for (int index = 0; index < names.length; index++) {
                    float[] audio = readPcmWave(names[index] + ".wav");
                    engine.beginSession();
                    String actual = engine.transcribe(audio).trim();
                    String normalized = Normalizer.normalize(actual, Normalizer.Form.NFD)
                            .replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT);
                    boolean casePassed = true;
                    for (String word : words[index]) casePassed &= normalized.contains(word);
                    passed &= casePassed;
                    cases.put(new JSONObject().put("case", names[index]).put("actual", actual).put("passed", casePassed));
                    progress(names[index] + ": " + actual);
                }
                engine.beginSession();
                engine.cancel();
                String cancelled = engine.transcribe(readPcmWave("food.wav"));
                require(cancelled.isEmpty(), "Cancelled inference returned text");
                cases.put(new JSONObject().put("case", "cancelled").put("passed", true));
            }
            JSONObject report = new JSONObject().put("status", passed ? "passed" : "failed").put("tests", cases)
                    .put("elapsed_ms", System.currentTimeMillis() - started)
                    .put("scope", "Real Android JNI with synthetic audio; does not validate physical microphone or TTS");
            result.putString("report", report.toString());
            finish(passed ? Activity.RESULT_OK : Activity.RESULT_CANCELED, result);
        } catch (Throwable error) {
            result.putString("status", "failed");
            result.putString("error", error.toString());
            finish(Activity.RESULT_CANCELED, result);
        }
    }

    private void progress(String stage) {
        Bundle status = new Bundle();
        status.putString("stage", stage);
        sendStatus(0, status);
    }

    private File prepareModel() throws Exception {
        String checksum;
        try (InputStream input = getTargetContext().getAssets().open("whisper/ggml-tiny.bin.sha256")) {
            checksum = new String(readAll(input), StandardCharsets.UTF_8).trim();
        }
        require(checksum.matches("[a-fA-F0-9]{64}"), "Invalid test model checksum");
        File directory = new File(getTargetContext().getNoBackupFilesDir(), "whisper-model");
        require(directory.isDirectory() || directory.mkdirs(), "Cannot prepare model directory");
        File file = new File(directory, checksum.toLowerCase(Locale.ROOT) + ".bin");
        if (!file.isFile()) {
            try (InputStream input = getTargetContext().getAssets().open("whisper/ggml-tiny.bin");
                 FileOutputStream output = new FileOutputStream(file)) {
                byte[] buffer = new byte[65536];
                int count;
                while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
            }
        }
        return file;
    }

    private float[] readPcmWave(String name) throws Exception {
        byte[] bytes;
        try (InputStream input = getContext().getAssets().open(name)) { bytes = readAll(input); }
        ByteBuffer data = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN);
        require(data.getInt(0) == 0x46464952 && data.getInt(8) == 0x45564157, "Not a WAV fixture");
        boolean validFormat = false;
        int position = 12;
        while (position + 8 <= bytes.length) {
            int kind = data.getInt(position);
            int size = data.getInt(position + 4);
            require(size >= 0 && position + 8L + size <= bytes.length, "Invalid WAV chunk");
            int payload = position + 8;
            if (kind == 0x20746d66) {
                require(size >= 16, "Invalid WAV format");
                validFormat = data.getShort(payload) == 1 && data.getShort(payload + 2) == 1
                        && data.getInt(payload + 4) == 16000 && data.getShort(payload + 14) == 16;
            } else if (kind == 0x61746164) {
                require(validFormat && size > 0 && size <= 16000 * 2 * 15, "Fixture must be PCM16 mono at 16kHz");
                float[] samples = new float[size / 2];
                for (int index = 0; index < samples.length; index++) samples[index] = data.getShort(payload + index * 2) / 32768.0f;
                return samples;
            }
            position = payload + size + (size & 1);
        }
        throw new IllegalArgumentException("WAV data missing");
    }

    private static byte[] readAll(InputStream input) throws Exception {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int count;
        while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
        return output.toByteArray();
    }

    private static void require(boolean value, String message) {
        if (!value) throw new AssertionError(message);
    }
}

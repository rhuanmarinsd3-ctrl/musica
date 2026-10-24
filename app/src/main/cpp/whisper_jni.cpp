#include <jni.h>
#include <android/log.h>
#include <whisper.h>

#include <algorithm>
#include <atomic>
#include <cmath>
#include <cstdint>
#include <exception>
#include <memory>
#include <string>
#include <vector>

namespace {
struct Engine {
    whisper_context * context = nullptr;
    std::atomic<bool> cancelled{false};
    ~Engine() { if (context) whisper_free(context); }
};

void fail(JNIEnv * env, const char * message) {
    jclass error = env->FindClass("java/io/IOException");
    if (error) env->ThrowNew(error, message);
}

Engine * engine(jlong handle) { return reinterpret_cast<Engine *>(static_cast<intptr_t>(handle)); }

bool should_abort(void * data) { return static_cast<Engine *>(data)->cancelled.load(); }

jstring java_string(JNIEnv * env, const std::string & text) {
    auto bytes = env->NewByteArray(static_cast<jsize>(text.size()));
    if (!bytes) return nullptr;
    env->SetByteArrayRegion(bytes, 0, static_cast<jsize>(text.size()), reinterpret_cast<const jbyte *>(text.data()));
    jclass string_class = env->FindClass("java/lang/String");
    jmethodID constructor = env->GetMethodID(string_class, "<init>", "([BLjava/lang/String;)V");
    jstring encoding = env->NewStringUTF("UTF-8");
    return static_cast<jstring>(env->NewObject(string_class, constructor, bytes, encoding));
}
}

extern "C" JNIEXPORT jlong JNICALL
Java_br_com_vozesinais_app_OfflineWhisper_nativeLoad(JNIEnv * env, jclass, jstring path) try {
    if (!path) { fail(env, "Missing offline speech model"); return 0; }
    const char * filename = env->GetStringUTFChars(path, nullptr);
    if (!filename) return 0;
    std::string model_path(filename);
    env->ReleaseStringUTFChars(path, filename);
    whisper_log_set([](enum ggml_log_level level, const char * text, void *) {
        if (level == GGML_LOG_LEVEL_ERROR) __android_log_write(ANDROID_LOG_ERROR, "VozWhisper", text);
    }, nullptr);
    auto instance = std::make_unique<Engine>();
    whisper_context_params parameters = whisper_context_default_params();
    parameters.use_gpu = false;
    parameters.flash_attn = false;
    instance->context = whisper_init_from_file_with_params(model_path.c_str(), parameters);
    if (!instance->context) { fail(env, "Cannot open the offline speech model"); return 0; }
    return static_cast<jlong>(reinterpret_cast<intptr_t>(instance.release()));
} catch (const std::exception &) {
    fail(env, "Insufficient resources to prepare offline speech");
    return 0;
}

extern "C" JNIEXPORT jstring JNICALL
Java_br_com_vozesinais_app_OfflineWhisper_nativeTranscribe(JNIEnv * env, jclass, jlong handle, jfloatArray audio, jint threads) try {
    auto instance = engine(handle);
    if (!instance || !audio) { fail(env, "Offline speech engine unavailable"); return nullptr; }
    const jsize count = env->GetArrayLength(audio);
    if (count < WHISPER_SAMPLE_RATE / 3 || count > WHISPER_SAMPLE_RATE * 15 || instance->cancelled.load()) {
        return java_string(env, "");
    }
    std::vector<float> samples(static_cast<size_t>(count));
    env->GetFloatArrayRegion(audio, 0, count, samples.data());
    if (env->ExceptionCheck()) return nullptr;
    double energy = 0.0;
    float peak = 0.0f;
    for (float & sample : samples) {
        sample = std::isfinite(sample) ? std::clamp(sample, -1.0f, 1.0f) : 0.0f;
        energy += static_cast<double>(sample) * sample;
        peak = std::max(peak, std::abs(sample));
    }
    // Reject empty/inaudible input instead of letting a decoder invent text for silence.
    if (std::sqrt(energy / count) < 0.0001 || peak < 0.001f) return java_string(env, "");
    whisper_full_params parameters = whisper_full_default_params(WHISPER_SAMPLING_GREEDY);
    parameters.n_threads = std::clamp(static_cast<int>(threads), 1, 4);
    parameters.language = "pt";
    parameters.detect_language = false;
    parameters.translate = false;
    parameters.no_context = true;
    parameters.no_timestamps = true;
    parameters.print_progress = false;
    parameters.print_realtime = false;
    parameters.print_timestamps = false;
    parameters.print_special = false;
    parameters.suppress_blank = true;
    parameters.suppress_nst = true;
    parameters.temperature = 0.0f;
    parameters.temperature_inc = 0.0f;
    parameters.abort_callback = should_abort;
    parameters.abort_callback_user_data = instance;
    int result = whisper_full(instance->context, parameters, samples.data(), count);
    if (instance->cancelled.load()) return java_string(env, "");
    if (result != 0) { fail(env, "Offline speech processing failed"); return nullptr; }
    std::string text;
    const int segments = whisper_full_n_segments(instance->context);
    for (int index = 0; index < segments; ++index) {
        if (whisper_full_get_segment_no_speech_prob(instance->context, index) > 0.8f) continue;
        const char * segment = whisper_full_get_segment_text(instance->context, index);
        if (segment) text += segment;
    }
    return java_string(env, text);
} catch (const std::exception &) {
    fail(env, "Insufficient resources to transcribe offline speech");
    return nullptr;
}

extern "C" JNIEXPORT void JNICALL
Java_br_com_vozesinais_app_OfflineWhisper_nativeResetCancellation(JNIEnv *, jclass, jlong handle) {
    if (auto instance = engine(handle)) instance->cancelled.store(false);
}

extern "C" JNIEXPORT void JNICALL
Java_br_com_vozesinais_app_OfflineWhisper_nativeCancel(JNIEnv *, jclass, jlong handle) {
    if (auto instance = engine(handle)) instance->cancelled.store(true);
}

extern "C" JNIEXPORT void JNICALL
Java_br_com_vozesinais_app_OfflineWhisper_nativeFree(JNIEnv *, jclass, jlong handle) {
    delete engine(handle);
}

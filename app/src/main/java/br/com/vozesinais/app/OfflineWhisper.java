package br.com.vozesinais.app;

import java.io.Closeable;
import java.io.File;
import java.io.IOException;
import java.util.concurrent.locks.ReentrantReadWriteLock;

/** A local Whisper context. Audio and text never leave the process. */
final class OfflineWhisper implements Closeable {
    static {
        System.loadLibrary("voz_whisper");
    }

    private final ReentrantReadWriteLock lifetime = new ReentrantReadWriteLock();
    private long handle;

    OfflineWhisper(File file) throws IOException {
        handle = nativeLoad(file.getAbsolutePath());
        if (handle == 0) throw new IOException("Cannot load the offline speech model");
    }

    void beginSession() {
        lifetime.readLock().lock();
        try {
            if (handle != 0) nativeResetCancellation(handle);
        } finally {
            lifetime.readLock().unlock();
        }
    }

    String transcribe(float[] samples) throws IOException {
        lifetime.readLock().lock();
        try {
            if (handle == 0) throw new IOException("Offline speech model is closed");
            int threads = Math.max(1, Math.min(4, Runtime.getRuntime().availableProcessors()));
            return nativeTranscribe(handle, samples, threads);
        } finally {
            lifetime.readLock().unlock();
        }
    }

    void cancel() {
        // Multiple readers are intentional: cancellation must not wait for inference.
        lifetime.readLock().lock();
        try {
            if (handle != 0) nativeCancel(handle);
        } finally {
            lifetime.readLock().unlock();
        }
    }

    @Override
    public void close() {
        lifetime.writeLock().lock();
        try {
            if (handle != 0) {
                nativeFree(handle);
                handle = 0;
            }
        } finally {
            lifetime.writeLock().unlock();
        }
    }

    private static native long nativeLoad(String path) throws IOException;
    private static native String nativeTranscribe(long handle, float[] samples, int threads) throws IOException;
    private static native void nativeResetCancellation(long handle);
    private static native void nativeCancel(long handle);
    private static native void nativeFree(long handle);
}

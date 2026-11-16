package com.kokabfodool.shell;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.Voice;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Set;

public final class FudoolDevice {
    private static final int CREATE_BACKUP = 67;
    private static final int OPEN_BACKUP = 68;
    private static final int MAX_BACKUP_BYTES = 4096;

    private final Activity activity;
    private final WebView web;
    private final boolean emailBackupAvailable;
    private TextToSpeech speech;
    private boolean speechReady;
    private Runnable pendingSpeech;
    private String exportData;
    private boolean pickerOpen;
    private boolean closed;

    FudoolDevice(Activity activity, WebView web, boolean emailBackupAvailable) {
        this.activity = activity;
        this.web = web;
        this.emailBackupAvailable = emailBackupAvailable;
    }

    @JavascriptInterface
    public boolean emailBackupAvailable() {
        return emailBackupAvailable;
    }

    @JavascriptInterface
    public void say(String phrase, String language, float volume) {
        if (phrase == null || phrase.length() > 140 || !("ar".equals(language) || "en".equals(language))
                || Float.isNaN(volume) || volume <= 0 || volume > 1) return;
        activity.runOnUiThread(() -> {
            if (closed) return;
            pendingSpeech = () -> speakInstalled(phrase, language, volume);
            if (speechReady) {
                playPendingSpeech();
            } else if (speech == null) {
                speech = new TextToSpeech(activity, result -> web.post(() -> {
                    if (closed) return;
                    speechReady = result == TextToSpeech.SUCCESS;
                    if (speechReady) playPendingSpeech();
                    else {
                        pendingSpeech = null;
                        speech.shutdown();
                        speech = null;
                    }
                }));
            }
        });
    }

    private void playPendingSpeech() {
        Runnable next = pendingSpeech;
        pendingSpeech = null;
        if (next != null) next.run();
    }

    private void speakInstalled(String phrase, String language, float volume) {
        Set<Voice> voices = speech.getVoices();
        if (voices == null) return;
        Voice best = null;
        String preferredCountry = "ar".equals(language) ? "SA" : "US";
        for (Voice voice : voices) {
            Locale locale = voice.getLocale();
            if (!language.equals(locale.getLanguage()) || voice.isNetworkConnectionRequired()
                    || voice.getFeatures().contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)) continue;
            if (best == null || preferredCountry.equals(locale.getCountry())) best = voice;
        }
        if (best == null || speech.setVoice(best) != TextToSpeech.SUCCESS) return;
        Bundle params = new Bundle();
        params.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, volume);
        speech.setSpeechRate(.88f);
        speech.speak(phrase, TextToSpeech.QUEUE_FLUSH, params, "fudool-encouragement");
    }

    @JavascriptInterface
    public void stopVoice() {
        activity.runOnUiThread(() -> {
            pendingSpeech = null;
            if (speechReady) speech.stop();
        });
    }

    @JavascriptInterface
    public void saveBackup(String payload) {
        if (payload == null || payload.getBytes(StandardCharsets.UTF_8).length > MAX_BACKUP_BYTES) return;
        activity.runOnUiThread(() -> {
            if (closed || pickerOpen || !isSettings()) return;
            exportData = payload;
            Intent picker = new Intent(Intent.ACTION_CREATE_DOCUMENT)
                    .addCategory(Intent.CATEGORY_OPENABLE)
                    .setType("application/json")
                    .putExtra(Intent.EXTRA_TITLE, "kokab-fodool-progress.json");
            pick(picker, CREATE_BACKUP);
        });
    }

    @JavascriptInterface
    public void openBackup() {
        activity.runOnUiThread(() -> {
            if (closed || pickerOpen || !isSettings()) return;
            Intent picker = new Intent(Intent.ACTION_OPEN_DOCUMENT)
                    .addCategory(Intent.CATEGORY_OPENABLE)
                    .setType("*/*")
                    .putExtra(Intent.EXTRA_MIME_TYPES,
                            new String[]{"application/json", "text/plain", "application/octet-stream"});
            pick(picker, OPEN_BACKUP);
        });
    }

    private boolean isSettings() {
        String current = web.getUrl();
        return current != null && current.matches("^https://appassets\\.androidplatform\\.net/(en/)?app/settings/(?:[?#].*)?$");
    }

    private void pick(Intent picker, int request) {
        pickerOpen = true;
        try {
            activity.startActivityForResult(picker, request);
        } catch (android.content.ActivityNotFoundException error) {
            pickerOpen = false;
            exportData = null;
            reply("error", "");
        }
    }

    boolean onActivityResult(int request, int result, Intent intent) {
        if (request != CREATE_BACKUP && request != OPEN_BACKUP) return false;
        pickerOpen = false;
        String payload = exportData;
        exportData = null;
        if (result != Activity.RESULT_OK) return true;
        Uri uri = intent == null ? null : intent.getData();
        if (uri == null || !"content".equals(uri.getScheme())) {
            reply("error", "");
            return true;
        }
        new Thread(() -> transfer(request, uri, payload), "fudool-progress-file").start();
        return true;
    }

    private void transfer(int request, Uri uri, String payload) {
        try {
            if (request == CREATE_BACKUP) {
                try (OutputStream out = activity.getContentResolver().openOutputStream(uri, "w")) {
                    if (out == null || payload == null) throw new IllegalStateException();
                    out.write(payload.getBytes(StandardCharsets.UTF_8));
                }
                reply("saved", "");
                return;
            }
            try (InputStream input = activity.getContentResolver().openInputStream(uri)) {
                if (input == null) throw new IllegalStateException();
                ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                byte[] buffer = new byte[1024];
                int read;
                while ((read = input.read(buffer)) != -1) {
                    if (bytes.size() + read > MAX_BACKUP_BYTES) throw new IllegalArgumentException();
                    bytes.write(buffer, 0, read);
                }
                reply("import", new String(bytes.toByteArray(), StandardCharsets.UTF_8));
            }
        } catch (Exception error) {
            reply("error", "");
        }
    }

    private void reply(String status, String payload) {
        activity.runOnUiThread(() -> {
            if (!closed && isSettings()) {
                web.evaluateJavascript("window.fudoolBackupFile&&window.fudoolBackupFile("
                        + JSONObject.quote(status) + "," + JSONObject.quote(payload) + ")", null);
            }
        });
    }

    void close() {
        closed = true;
        pendingSpeech = null;
        if (speech != null) speech.shutdown();
    }
}

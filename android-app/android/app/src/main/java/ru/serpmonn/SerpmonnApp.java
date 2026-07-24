package ru.serpmonn;

import android.app.Application;
import android.util.Log;

import ru.rustore.sdk.pushclient.RuStorePushClient;
import ru.rustore.sdk.pushclient.common.logger.DefaultLogger;

/**
 * Native Application entry for RuStore Push SDK.
 * Project ID: RuStore Console → приложение → Push-уведомления → Проекты.
 * Put it in android-app/rustore.properties as pushProjectId=...
 */
public class SerpmonnApp extends Application {
    private static final String TAG = "SerpmonnApp";

    @Override
    public void onCreate() {
        super.onCreate();
        initRuStorePush();
    }

    private void initRuStorePush() {
        final String projectId = BuildConfig.RUSTORE_PUSH_PROJECT_ID;
        if (projectId == null || projectId.isEmpty()) {
            Log.w(TAG, "RuStore Push: pushProjectId пуст — задайте в rustore.properties");
            return;
        }
        try {
            RuStorePushClient.INSTANCE.init(
                    this,
                    projectId,
                    new DefaultLogger(TAG)
            );
            Log.i(TAG, "RuStore Push SDK initialized");
            RuStorePushClient.INSTANCE.getToken()
                    .addOnSuccessListener(token -> Log.i("SerpmonnPush", "Push token: " + token))
                    .addOnFailureListener(err -> Log.e("SerpmonnPush", "getToken failed", err));
        } catch (Throwable t) {
            Log.e(TAG, "RuStore Push SDK init failed", t);
        }
    }
}

package ru.serpmonn;

import android.util.Log;

import androidx.annotation.NonNull;

import java.util.List;

import ru.rustore.sdk.pushclient.messaging.exception.RuStorePushClientException;
import ru.rustore.sdk.pushclient.messaging.model.RemoteMessage;
import ru.rustore.sdk.pushclient.messaging.service.RuStoreMessagingService;

/**
 * Receives RuStore push events. Notification payloads with title are shown by the SDK.
 * Data-only messages can be handled in onMessageReceived later.
 */
public class PushListenerService extends RuStoreMessagingService {
    private static final String TAG = "SerpmonnPush";

    @Override
    public void onNewToken(@NonNull String token) {
        Log.i(TAG, "New push token: " + token);
    }

    @Override
    public void onMessageReceived(@NonNull RemoteMessage message) {
        Log.i(TAG, "Push received, messageId=" + message.getMessageId());
        // Notification display for filled Notification.title is handled by RuStore SDK.
    }

    @Override
    public void onDeletedMessages() {
        Log.w(TAG, "One or more pushes were deleted / expired before delivery");
    }

    @Override
    public void onError(@NonNull List<? extends RuStorePushClientException> errors) {
        for (RuStorePushClientException error : errors) {
            Log.e(TAG, "Push SDK error", error);
        }
    }
}

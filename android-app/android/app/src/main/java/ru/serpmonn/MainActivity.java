package ru.serpmonn;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.messaging.FirebaseMessaging;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

public class MainActivity extends BridgeActivity {
    private static final int NAV_BAR_COLOR = 0xFF2A2A2A;
    private static final int REQ_POST_NOTIFICATIONS = 9102;
    private final Handler uiHandler = new Handler(Looper.getMainLooper());
    private volatile CountDownLatch pushPermLatch;
    private volatile String pushPermOutcome = "denied";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        ensureDmNotificationChannel();
        applySystemBars();
        attachNavInsetPublisher();
        Bridge bridge = getBridge();
        if (bridge != null && bridge.getWebView() != null) {
            attachJsBridge(bridge.getWebView());
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        applySystemBars();
        publishNavInsetsToWeb();
    }

    @Override
    public void onRequestPermissionsResult(
            int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_POST_NOTIFICATIONS && pushPermLatch != null) {
            pushPermOutcome =
                    grantResults.length > 0
                            && grantResults[0] == PackageManager.PERMISSION_GRANTED
                        ? "granted"
                        : "denied";
            pushPermLatch.countDown();
        }
    }

    private void attachJsBridge(WebView webView) {
        webView.addJavascriptInterface(new Object() {
            @JavascriptInterface
            public String getPushPermission() {
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
                    return "granted";
                }
                return ContextCompat.checkSelfPermission(
                                MainActivity.this, Manifest.permission.POST_NOTIFICATIONS)
                        == PackageManager.PERMISSION_GRANTED
                    ? "granted"
                    : "default";
            }

            @JavascriptInterface
            public String requestPushPermission() {
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
                    return "granted";
                }
                if (ContextCompat.checkSelfPermission(
                                MainActivity.this, Manifest.permission.POST_NOTIFICATIONS)
                        == PackageManager.PERMISSION_GRANTED) {
                    return "granted";
                }
                CountDownLatch latch = new CountDownLatch(1);
                pushPermOutcome = "denied";
                pushPermLatch = latch;
                uiHandler.post(
                        () ->
                                ActivityCompat.requestPermissions(
                                        MainActivity.this,
                                        new String[] {Manifest.permission.POST_NOTIFICATIONS},
                                        REQ_POST_NOTIFICATIONS));
                try {
                    if (!latch.await(90, TimeUnit.SECONDS)) {
                        return "denied";
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    return "denied";
                } finally {
                    pushPermLatch = null;
                }
                return pushPermOutcome;
            }

            @JavascriptInterface
            public String registerPushToken() {
                AtomicReference<String> out = new AtomicReference<>("ERR:timeout");
                CountDownLatch latch = new CountDownLatch(1);
                try {
                    FirebaseMessaging.getInstance().setAutoInitEnabled(true);
                    FirebaseMessaging.getInstance()
                            .getToken()
                            .addOnCompleteListener(
                                    task -> {
                                        if (task.isSuccessful() && task.getResult() != null) {
                                            out.set(task.getResult());
                                        } else {
                                            Exception err = task.getException();
                                            String msg = err != null ? err.getMessage() : "token_failed";
                                            out.set("ERR:" + (msg != null ? msg : "token_failed"));
                                        }
                                        latch.countDown();
                                    });
                    if (!latch.await(25, TimeUnit.SECONDS)) {
                        return "ERR:timeout";
                    }
                } catch (Exception e) {
                    String msg = e.getMessage();
                    return "ERR:" + e.getClass().getSimpleName()
                            + (msg != null ? (":" + msg) : "");
                }
                return out.get();
            }
        }, "SpnAndroid");
    }

    private void ensureDmNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) return;
        NotificationChannel channel =
                new NotificationChannel(
                        "dm_messages",
                        "Сообщения",
                        NotificationManager.IMPORTANCE_DEFAULT);
        channel.setDescription("Новые личные сообщения");
        manager.createNotificationChannel(channel);
    }

    private void applySystemBars() {
        Window window = getWindow();
        if (window == null) return;
        WindowCompat.setDecorFitsSystemWindows(window, true);
        window.setNavigationBarColor(NAV_BAR_COLOR);
        window.getDecorView().setBackgroundColor(NAV_BAR_COLOR);
        if (Build.VERSION.SDK_INT >= 29) {
            window.setNavigationBarContrastEnforced(false);
        }
        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(window, window.getDecorView());
        if (controller != null) {
            controller.setAppearanceLightNavigationBars(false);
            controller.setAppearanceLightStatusBars(true);
        }
    }

    private void attachNavInsetPublisher() {
        View decor = getWindow().getDecorView();
        ViewCompat.setOnApplyWindowInsetsListener(decor, (v, insets) -> {
            publishNavInsetsToWeb();
            return ViewCompat.onApplyWindowInsets(v, insets);
        });
        decor.post(this::publishNavInsetsToWeb);
    }

    private void publishNavInsetsToWeb() {
        View decor = getWindow().getDecorView();
        WindowInsetsCompat insets = ViewCompat.getRootWindowInsets(decor);
        if (insets == null) return;

        Bridge bridge = getBridge();
        if (bridge == null) return;
        WebView webView = bridge.getWebView();
        if (webView == null) return;

        int navPx = insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom;
        String js =
            "try{"
                + "window.__SPN_NAV_INSET_PX=" + navPx + ";"
                + "window.__SPN_DECOR_FITS_NAV=1;"
                + "if(typeof syncSystemNavChrome==='function')syncSystemNavChrome();"
                + "}catch(e){}";
        webView.post(() -> webView.evaluateJavascript(js, null));
    }
}

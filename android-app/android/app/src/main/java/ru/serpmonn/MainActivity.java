package ru.serpmonn;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.webkit.WebView;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int NAV_BAR_COLOR = 0xFF2A2A2A;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applySystemBars();
        attachNavInsetPublisher();
    }

    @Override
    public void onResume() {
        super.onResume();
        applySystemBars();
        publishNavInsetsToWeb();
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
            // Светлые системные кнопки на тёмной полосе
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

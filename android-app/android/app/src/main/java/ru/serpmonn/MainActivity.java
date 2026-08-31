package ru.serpmonn;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.Window;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int NAV_BAR_COLOR = 0xFF2A2A2A;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applySystemBars();
    }

    @Override
    public void onResume() {
        super.onResume();
        applySystemBars();
    }

    private void applySystemBars() {
        Window window = getWindow();
        if (window == null) return;
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
}

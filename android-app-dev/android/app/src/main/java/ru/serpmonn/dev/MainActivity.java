package ru.serpmonn.dev;

import android.app.DownloadManager;
import android.Manifest;
import android.annotation.SuppressLint;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.pm.PackageManager;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.HttpAuthHandler;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.getcapacitor.BridgeWebViewClient;
import com.google.firebase.messaging.FirebaseMessaging;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSocket;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.SNIHostName;
import javax.net.ssl.SSLParameters;

/** Dev shell: тот же Capacitor WebView, что и prod, но entry → dev.serpmonn.ru + Basic Auth. */
public class MainActivity extends BridgeActivity {
  private static final String DEV_USER = "dev";
  private static final String DEV_PASS = "ILwsxzEAwjSP2rpeIQpN";
  private static final int NAV_BAR_COLOR = 0xFF2A2A2A;
  private static final int REQ_POST_NOTIFICATIONS = 9102;
  private final Handler uiHandler = new Handler(Looper.getMainLooper());
  private volatile CountDownLatch pushPermLatch;
  private volatile String pushPermOutcome = "denied";
  private Runnable navWatchdog;
  private boolean uiVisibilityHooked = false;
  private boolean insetsHooked = false;
  private boolean imeWasVisible = false;

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    ensureDmNotificationChannel();
    // Keep layout resizing for the form, but we will force-show nav while IME is open.
    getWindow().setSoftInputMode(
        WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE
            | WindowManager.LayoutParams.SOFT_INPUT_STATE_HIDDEN);
    applySystemBars();
    attachNavInsetPublisher();
    if (bridge == null || bridge.getWebView() == null) return;

    bridge.getWebView().setWebViewClient(new BridgeWebViewClient(bridge) {
      @Override
      public void onReceivedHttpAuthRequest(
          WebView view, HttpAuthHandler handler, String host, String realm) {
        if (host != null && host.contains("dev.serpmonn.ru")) {
          handler.proceed(DEV_USER, DEV_PASS);
          return;
        }
        super.onReceivedHttpAuthRequest(view, handler, host, realm);
      }

      // iframe.src navigations must not be cancelled by Capacitor launchIntent.
      // Document content itself is loaded via srcdoc+fetch (Capacitor proxy).
      @Override
      public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        if (request != null && !request.isForMainFrame()) {
          return false;
        }
        return super.shouldOverrideUrlLoading(view, request);
      }

      /**
       * Capacitor proxies allowed-navigation HTML via Java HttpURLConnection
       * (30s timeouts). On this device that path deadlocks after startup and
       * breaks all subsequent WebView fetch()/XHR. Let Chromium talk to
       * serpmonn hosts directly; keep Capacitor handling for local/capacitor URLs.
       */
      @Override
      public android.webkit.WebResourceResponse shouldInterceptRequest(
          WebView view, WebResourceRequest request) {
        if (request != null && request.getUrl() != null) {
          String host = request.getUrl().getHost();
          String path = request.getUrl().getPath();
          boolean capacitorHttp =
              path != null && path.startsWith("/_capacitor_http_interceptor_");
          if (!capacitorHttp && host != null) {
            String h = host.toLowerCase();
            if (h.equals("serpmonn.ru")
                || h.equals("www.serpmonn.ru")
                || h.equals("dev.serpmonn.ru")
                || h.endsWith(".serpmonn.ru")) {
              return null;
            }
          }
        }
        return super.shouldInterceptRequest(view, request);
      }
    });

    // Capacitor requests RECORD_AUDIO + MODIFY_AUDIO_SETTINGS; if either is missing from the
    // result map, it denies the WebView PermissionRequest even after the user taps Allow.
    // When RECORD_AUDIO is already granted, grant AUDIO_CAPTURE immediately.
    bridge.getWebView().setWebChromeClient(new BridgeWebChromeClient(bridge) {
      @Override
      public void onPermissionRequest(final PermissionRequest request) {
        boolean needsAudio = Arrays.asList(request.getResources())
            .contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE);
        boolean hasMic = ContextCompat.checkSelfPermission(
                MainActivity.this, Manifest.permission.RECORD_AUDIO)
            == PackageManager.PERMISSION_GRANTED;
        if (needsAudio && hasMic) {
          request.grant(request.getResources());
          // getUserMedia often flips immersive/hide-nav — keep restoring longer
          watchNavBarsBriefly(4000);
          return;
        }
        super.onPermissionRequest(request);
        // User may grant in the system dialog a moment later
        if (needsAudio) watchNavBarsBriefly(4000);
      }

      @Override
      public void onHideCustomView() {
        super.onHideCustomView();
        watchNavBarsBriefly(5000);
      }

      @Override
      public void onShowCustomView(View view, WebChromeClient.CustomViewCallback callback) {
        // Do not allow WebView HTML5 fullscreen to swallow system nav in this app.
        try {
          if (callback != null) callback.onCustomViewHidden();
        } catch (Exception ignored) {
        }
        watchNavBarsBriefly(3000);
      }
    });

    attachJsBridge(bridge.getWebView());
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

  @SuppressLint("SetJavaScriptEnabled")
  private void attachJsBridge(WebView webView) {
    webView.addJavascriptInterface(new Object() {
      @JavascriptInterface
      public void restoreSystemBars() {
        uiHandler.post(() -> {
          MainActivity.this.restoreSystemBars();
          // Keyboard focus can re-hide nav a moment later — one short follow-up.
          watchNavBarsBriefly(2500);
        });
      }

      /**
       * Fetch HTML/text via native HTTP (bypasses flaky WebView fetch).
       * Only serpmonn.ru / *.serpmonn.ru. Returns body, or "ERR:…" on failure.
       */
      @JavascriptInterface
      public String fetchText(String url) {
        try {
          if (url == null || url.isEmpty()) return "ERR:empty";
          URL u = new URL(url);
          String host = u.getHost() == null ? "" : u.getHost().toLowerCase();
          boolean allowed =
              host.equals("serpmonn.ru")
                  || host.equals("www.serpmonn.ru")
                  || host.equals("dev.serpmonn.ru")
                  || host.endsWith(".serpmonn.ru");
          if (!allowed || !"https".equalsIgnoreCase(u.getProtocol())) {
            return "ERR:host";
          }
          return fetchTextHttps(u, host);
        } catch (Exception e) {
          String msg = e.getMessage();
          return "ERR:" + e.getClass().getSimpleName()
              + (msg != null ? (":" + msg) : "");
        }
      }

      /** Download http(s) file via system DownloadManager. Returns OK or ERR:… */
      @JavascriptInterface
      public String downloadFile(String url, String filename) {
        try {
          if (url == null || url.isEmpty()) return "ERR:empty";
          URL u = new URL(url);
          String host = u.getHost() == null ? "" : u.getHost().toLowerCase();
          boolean allowed =
              host.equals("serpmonn.ru")
                  || host.equals("www.serpmonn.ru")
                  || host.equals("dev.serpmonn.ru")
                  || host.endsWith(".serpmonn.ru");
          if (!allowed || !"https".equalsIgnoreCase(u.getProtocol())) {
            return "ERR:host";
          }
          String safeName = sanitizeDownloadName(filename, u.getFile());
          DownloadManager.Request request =
              new DownloadManager.Request(Uri.parse(url));
          request.setTitle(safeName);
          request.setDescription("Serpmonn");
          request.setNotificationVisibility(
              DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
          request.setAllowedOverMetered(true);
          request.setAllowedOverRoaming(true);
          request.setDestinationInExternalPublicDir(
              Environment.DIRECTORY_DOWNLOADS, safeName);
          if (host.contains("dev.serpmonn.ru")) {
            String token =
                Base64.encodeToString(
                    (DEV_USER + ":" + DEV_PASS).getBytes(StandardCharsets.UTF_8),
                    Base64.NO_WRAP);
            request.addRequestHeader("Authorization", "Basic " + token);
          }
          try {
            String cookie = CookieManager.getInstance().getCookie(url);
            if (cookie != null && !cookie.isEmpty()) {
              request.addRequestHeader("Cookie", cookie);
            }
          } catch (Exception ignored) {
          }
          DownloadManager dm =
              (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
          if (dm == null) return "ERR:dm";
          long id = dm.enqueue(request);
          if (id <= 0L) return "ERR:enqueue";
          uiHandler.post(() ->
              Toast.makeText(
                      MainActivity.this,
                      "Загрузка…",
                      Toast.LENGTH_SHORT)
                  .show());
          return "OK";
        } catch (Exception e) {
          String msg = e.getMessage();
          return "ERR:" + e.getClass().getSimpleName()
              + (msg != null ? (":" + msg) : "");
        }
      }

      /** Save blob/base64 (e.g. compose preview) into Downloads. */
      @JavascriptInterface
      public String downloadBlobBase64(String base64, String filename, String mime) {
        try {
          if (base64 == null || base64.isEmpty()) return "ERR:empty";
          byte[] data = Base64.decode(base64, Base64.DEFAULT);
          String safeName = sanitizeDownloadName(filename, null);
          String useMime =
              mime != null && !mime.isEmpty()
                  ? mime
                  : guessDownloadMime(safeName);
          saveBytesToDownloads(safeName, useMime, data);
          return "OK";
        } catch (Exception e) {
          String msg = e.getMessage();
          return "ERR:" + e.getClass().getSimpleName()
              + (msg != null ? (":" + msg) : "");
        }
      }

      /** POST_NOTIFICATIONS state: granted | denied | default */
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

      /** Request notification permission; blocks until user answers. */
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

      /** FCM token or ERR:… */
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

  private static String sanitizeDownloadName(String filename, String path) {
    String raw = filename;
    if (raw == null || raw.trim().isEmpty()) {
      raw = path == null ? "" : path;
      int slash = raw.lastIndexOf('/');
      if (slash >= 0 && slash + 1 < raw.length()) raw = raw.substring(slash + 1);
    }
    raw = raw.replaceAll("[\\\\/:*?\"<>|]", "_").trim();
    if (raw.isEmpty()) raw = "download";
    if (raw.length() > 120) raw = raw.substring(raw.length() - 120);
    return raw;
  }

  private static String guessDownloadMime(String name) {
    String lower = name == null ? "" : name.toLowerCase();
    if (lower.endsWith(".webp")) return "image/webp";
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".webm")) return "audio/webm";
    if (lower.endsWith(".ogg")) return "audio/ogg";
    if (lower.endsWith(".mp3")) return "audio/mpeg";
    if (lower.endsWith(".wav")) return "audio/wav";
    if (lower.endsWith(".m4a")) return "audio/mp4";
    return "application/octet-stream";
  }

  private void saveBytesToDownloads(String filename, String mime, byte[] data) throws IOException {
    if (data == null || data.length == 0) throw new IOException("empty");
    ContentResolver resolver = getContentResolver();
    ContentValues values = new ContentValues();
    values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
    values.put(MediaStore.Downloads.MIME_TYPE, mime);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
      values.put(MediaStore.Downloads.IS_PENDING, 1);
    }
    Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
    if (uri == null) throw new IOException("uri");
    try (OutputStream out = resolver.openOutputStream(uri)) {
      if (out == null) throw new IOException("stream");
      out.write(data);
      out.flush();
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      ContentValues done = new ContentValues();
      done.put(MediaStore.Downloads.IS_PENDING, 0);
      resolver.update(uri, done, null, null);
    }
    uiHandler.post(() ->
        Toast.makeText(
                MainActivity.this,
                "Сохранено в Загрузки",
                Toast.LENGTH_SHORT)
            .show());
  }

  private byte[] fetchBytesHttps(URL logicalUrl, String host) throws Exception {
    Exception last = null;
    List<String> targets =
        host.contains("dev.serpmonn.ru")
            ? Arrays.asList("192.168.0.100", "188.235.13.20")
            : Arrays.asList("188.235.13.20", "192.168.0.100");
    for (String target : targets) {
      HttpURLConnection conn = null;
      try {
        URL connectUrl = new URL("https", target, 443, logicalUrl.getFile());
        conn = openHttps(connectUrl, host);
        conn.setConnectTimeout(2500);
        conn.setReadTimeout(12000);
        conn.setInstanceFollowRedirects(true);
        conn.setRequestMethod("GET");
        conn.setRequestProperty("Host", host);
        conn.setRequestProperty("Accept", "*/*");
        conn.setRequestProperty("User-Agent", "SerpmonnDev/1.0 (SpnAndroid)");
        if (host.contains("dev.serpmonn.ru")) {
          String token =
              Base64.encodeToString(
                  (DEV_USER + ":" + DEV_PASS).getBytes(StandardCharsets.UTF_8),
                  Base64.NO_WRAP);
          conn.setRequestProperty("Authorization", "Basic " + token);
        }
        try {
          String cookie = CookieManager.getInstance().getCookie(logicalUrl.toString());
          if (cookie != null && !cookie.isEmpty()) {
            conn.setRequestProperty("Cookie", cookie);
          }
        } catch (Exception ignored) {
        }
        int code = conn.getResponseCode();
        InputStream stream =
            code >= 400 ? conn.getErrorStream() : conn.getInputStream();
        if (stream == null) {
          last = new IOException("HTTP " + code + " empty");
          continue;
        }
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n;
        while ((n = stream.read(buf)) >= 0) {
          bos.write(buf, 0, n);
          if (bos.size() > 8_000_000) throw new IOException("too_large");
        }
        if (code >= 400) {
          last = new IOException("HTTP " + code);
          continue;
        }
        return bos.toByteArray();
      } catch (Exception e) {
        last = e;
      } finally {
        if (conn != null) conn.disconnect();
      }
    }
    throw last != null ? last : new IOException("fetch failed");
  }

  /** Prefer LAN/public IP with SNI — process DNS for *.serpmonn.ru often fails on device. */
  private String fetchTextHttps(URL logicalUrl, String host) throws Exception {
    Exception last = null;
    // Skip hostname DNS: JavascriptInterface DNS fails with UnknownHostException on this device
    // while WebView resolves fine. Use known IPs + SNI Host instead.
    List<String> targets =
        host.contains("dev.serpmonn.ru")
            ? Arrays.asList("192.168.0.100", "188.235.13.20")
            : Arrays.asList("188.235.13.20", "192.168.0.100");
    for (String target : targets) {
      HttpURLConnection conn = null;
      try {
        URL connectUrl = new URL("https", target, 443, logicalUrl.getFile());
        conn = openHttps(connectUrl, host);
        conn.setConnectTimeout(2500);
        conn.setReadTimeout(8000);
        conn.setInstanceFollowRedirects(true);
        conn.setRequestMethod("GET");
        conn.setRequestProperty("Host", host);
        conn.setRequestProperty("Accept", "text/html,application/xhtml+xml,*/*");
        conn.setRequestProperty("User-Agent", "SerpmonnDev/1.0 (SpnAndroid)");
        if (host.contains("dev.serpmonn.ru")) {
          String token =
              Base64.encodeToString(
                  (DEV_USER + ":" + DEV_PASS).getBytes(StandardCharsets.UTF_8),
                  Base64.NO_WRAP);
          conn.setRequestProperty("Authorization", "Basic " + token);
        }
        try {
          String cookie = CookieManager.getInstance().getCookie(logicalUrl.toString());
          if (cookie != null && !cookie.isEmpty()) {
            conn.setRequestProperty("Cookie", cookie);
          }
        } catch (Exception ignored) {
        }
        int code = conn.getResponseCode();
        InputStream stream =
            code >= 400 ? conn.getErrorStream() : conn.getInputStream();
        if (stream == null) {
          last = new IOException("HTTP " + code + " empty");
          continue;
        }
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n;
        while ((n = stream.read(buf)) >= 0) {
          bos.write(buf, 0, n);
          if (bos.size() > 2_000_000) return "ERR:too_large";
        }
        String body = bos.toString(StandardCharsets.UTF_8.name());
        if (code >= 400) {
          last = new IOException("HTTP " + code);
          continue;
        }
        return body;
      } catch (Exception e) {
        last = e;
      } finally {
        if (conn != null) conn.disconnect();
      }
    }
    throw last != null ? last : new IOException("fetch failed");
  }

  private HttpURLConnection openHttps(URL connectUrl, String sniHost) throws Exception {
    ConnectivityManager cm =
        (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
    Network network = cm != null ? cm.getActiveNetwork() : null;
    HttpURLConnection conn;
    if (network != null) {
      conn = (HttpURLConnection) network.openConnection(connectUrl);
    } else {
      conn = (HttpURLConnection) connectUrl.openConnection();
    }
    if (conn instanceof HttpsURLConnection) {
      HttpsURLConnection https = (HttpsURLConnection) conn;
      SSLSocketFactory base = HttpsURLConnection.getDefaultSSLSocketFactory();
      https.setSSLSocketFactory(new SniSSLSocketFactory(base, sniHost));
      https.setHostnameVerifier((hostname, session) -> {
        try {
          String peer = session.getPeerHost();
          return sniHost.equalsIgnoreCase(hostname)
              || sniHost.equalsIgnoreCase(peer)
              || (peer != null && peer.toLowerCase().endsWith(".serpmonn.ru"));
        } catch (Exception e) {
          return sniHost.equalsIgnoreCase(hostname);
        }
      });
    }
    return conn;
  }

  /** SSLSocketFactory that always sends the logical Host as SNI (needed for IP fallbacks). */
  private static final class SniSSLSocketFactory extends SSLSocketFactory {
    private final SSLSocketFactory delegate;
    private final String sniHost;

    SniSSLSocketFactory(SSLSocketFactory delegate, String sniHost) {
      this.delegate = delegate;
      this.sniHost = sniHost;
    }

    private Socket applySni(Socket socket) throws IOException {
      if (!(socket instanceof SSLSocket)) return socket;
      SSLSocket ssl = (SSLSocket) socket;
      try {
        SSLParameters params = ssl.getSSLParameters();
        params.setServerNames(Arrays.asList(new SNIHostName(sniHost)));
        ssl.setSSLParameters(params);
      } catch (Exception ignored) {
      }
      return ssl;
    }

    @Override public String[] getDefaultCipherSuites() {
      return delegate.getDefaultCipherSuites();
    }

    @Override public String[] getSupportedCipherSuites() {
      return delegate.getSupportedCipherSuites();
    }

    @Override public Socket createSocket(Socket s, String host, int port, boolean autoClose)
        throws IOException {
      return applySni(delegate.createSocket(s, sniHost, port, autoClose));
    }

    @Override public Socket createSocket(String host, int port) throws IOException {
      return applySni(delegate.createSocket(host, port));
    }

    @Override public Socket createSocket(String host, int port, InetAddress localHost, int localPort)
        throws IOException {
      return applySni(delegate.createSocket(host, port, localHost, localPort));
    }

    @Override public Socket createSocket(InetAddress host, int port) throws IOException {
      return applySni(delegate.createSocket(host, port));
    }

    @Override public Socket createSocket(
        InetAddress address, int port, InetAddress localAddress, int localPort)
        throws IOException {
      return applySni(delegate.createSocket(address, port, localAddress, localPort));
    }
  }

  @Override
  public void onResume() {
    super.onResume();
    restoreSystemBars();
  }

  @Override
  public void onWindowFocusChanged(boolean hasFocus) {
    super.onWindowFocusChanged(hasFocus);
    if (hasFocus) restoreSystemBars();
  }

  /** Short burst only after mic/permission — not a permanent poller. */
  private void watchNavBarsBriefly(long durationMs) {
    if (navWatchdog != null) uiHandler.removeCallbacks(navWatchdog);
    final long until = SystemClock.uptimeMillis() + Math.max(500, durationMs);
    navWatchdog = new Runnable() {
      @Override
      public void run() {
        restoreSystemBars();
        if (SystemClock.uptimeMillis() < until) {
          uiHandler.postDelayed(this, 400);
        }
      }
    };
    uiHandler.post(navWatchdog);
  }

  private void restoreSystemBars() {
    applySystemBars();
    publishNavInsetsToWeb();
  }

  private void clearImmersiveFlags(View decor) {
    int flags = decor.getSystemUiVisibility();
    int hide =
        View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_FULLSCREEN
            | View.SYSTEM_UI_FLAG_IMMERSIVE
            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN;
    if ((flags & hide) != 0) {
      decor.setSystemUiVisibility(flags & ~hide);
    }
  }

  private void forceShowNavigationBars() {
    Window window = getWindow();
    if (window == null) return;
    window.clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
    WindowCompat.setDecorFitsSystemWindows(window, true);
    View decor = window.getDecorView();
    clearImmersiveFlags(decor);
    window.setNavigationBarColor(NAV_BAR_COLOR);
    WindowInsetsControllerCompat controller =
        WindowCompat.getInsetsController(window, decor);
    if (controller != null) {
      controller.setSystemBarsBehavior(
          WindowInsetsControllerCompat.BEHAVIOR_DEFAULT);
      controller.show(WindowInsetsCompat.Type.navigationBars());
      controller.show(WindowInsetsCompat.Type.statusBars());
    }
  }

  private void applySystemBars() {
    Window window = getWindow();
    if (window == null) return;
    WindowCompat.setDecorFitsSystemWindows(window, true);
    window.clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
    window.setNavigationBarColor(NAV_BAR_COLOR);
    window.getDecorView().setBackgroundColor(NAV_BAR_COLOR);
    if (Build.VERSION.SDK_INT >= 29) {
      window.setNavigationBarContrastEnforced(false);
    }
    View decor = window.getDecorView();
    clearImmersiveFlags(decor);
    if (!uiVisibilityHooked) {
      uiVisibilityHooked = true;
      decor.setOnSystemUiVisibilityChangeListener(visibility -> {
        int hidden =
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_IMMERSIVE
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY;
        if ((visibility & hidden) != 0) {
          decor.post(MainActivity.this::forceShowNavigationBars);
        }
      });
    }
    forceShowNavigationBars();
    WindowInsetsControllerCompat controller =
        WindowCompat.getInsetsController(window, decor);
    if (controller != null) {
      controller.setAppearanceLightNavigationBars(false);
      controller.setAppearanceLightStatusBars(true);
    }
  }

  private void attachNavInsetPublisher() {
    View decor = getWindow().getDecorView();
    if (!insetsHooked) {
      insetsHooked = true;
      ViewCompat.setOnApplyWindowInsetsListener(decor, (v, insets) -> {
        boolean imeVisible = insets.isVisible(WindowInsetsCompat.Type.ime());
        boolean navVisible = insets.isVisible(WindowInsetsCompat.Type.navigationBars());
        // Ask system to keep nav visible with keyboard — but do not thrash every frame.
        if (imeVisible && !navVisible) {
          forceShowNavigationBars();
        } else if (!imeVisible && !navVisible) {
          v.post(MainActivity.this::restoreSystemBars);
        }
        imeWasVisible = imeVisible;
        publishNavInsetsToWeb();
        return ViewCompat.onApplyWindowInsets(v, insets);
      });
    }
    decor.post(this::publishNavInsetsToWeb);
  }

  /** Publish only a sane nav-bar inset to JS (ignore IME-sized junk). */
  private void publishNavInsetsToWeb() {
    View decor = getWindow().getDecorView();
    WindowInsetsCompat insets = ViewCompat.getRootWindowInsets(decor);
    if (insets == null) return;

    Bridge bridge = getBridge();
    if (bridge == null) return;
    WebView webView = bridge.getWebView();
    if (webView == null) return;

    int navPx = insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom;
    // Guard: while IME is open some OEMs report huge "nav" insets.
    if (insets.isVisible(WindowInsetsCompat.Type.ime()) && navPx > 72) {
      navPx = 48;
    } else if (navPx > 72) {
      navPx = 48;
    }
    final int publishPx = Math.max(0, navPx);
    String js =
        "try{"
            + "window.__SPN_NAV_INSET_PX=" + publishPx + ";"
            + "window.__SPN_DECOR_FITS_NAV=1;"
            + "if(typeof syncSystemNavChrome==='function')syncSystemNavChrome();"
            + "}catch(e){}";
    webView.post(() -> webView.evaluateJavascript(js, null));
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
}

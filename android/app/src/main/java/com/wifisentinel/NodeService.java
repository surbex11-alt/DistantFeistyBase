package com.wifisentinel;

import android.content.Context;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.os.Build;
import java.util.Locale;
import java.util.UUID;

/** Lightweight local node identity/measurement payload. Network transport is intentionally local-only. */
public final class NodeService {
    private final String nodeId = UUID.randomUUID().toString();
    private final WifiManager wifi;

    public NodeService(Context context) {
        wifi = (WifiManager) context.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
    }

    public String getNodeId() { return nodeId; }

    public String measurementJson() {
        WifiInfo info = wifi == null ? null : wifi.getConnectionInfo();
        int rssi = info == null ? -127 : info.getRssi();
        int frequency = Build.VERSION.SDK_INT >= 21 && info != null ? info.getFrequency() : 0;
        return String.format(Locale.US,
                "{\"nodeId\":\"%s\",\"timestamp\":%d,\"rssi\":%d,\"frequency\":%d}",
                nodeId, System.currentTimeMillis(), rssi, frequency);
    }
}

package com.asadzia.wifisentinel;

import android.Manifest;
import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.net.wifi.ScanResult;
import android.net.wifi.WifiManager;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

public class MainActivity extends Activity {
    private static final int REQ_LOCATION = 1001;
    private WifiManager wifi;
    private TextView status;
    private LinearLayout list;
    private Button scanButton;
    private BroadcastReceiver receiver;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        buildUi();
        wifi = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
        receiver = new BroadcastReceiver() {
            @Override public void onReceive(Context context, Intent intent) {
                boolean updated = intent.getBooleanExtra(WifiManager.EXTRA_RESULTS_UPDATED, false);
                renderResults(updated);
            }
        };
        registerReceiver(receiver, new IntentFilter(WifiManager.SCAN_RESULTS_AVAILABLE_ACTION));
        ensurePermission();
    }

    private void buildUi() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(24, 24, 24, 12);
        root.setBackgroundColor(0xFF050807);

        TextView title = new TextView(this);
        title.setText("◈ WIFI SENTINEL\nNETWORK INTELLIGENCE");
        title.setTextColor(0xFF00FF88);
        title.setTextSize(20);
        title.setTypeface(android.graphics.Typeface.MONOSPACE, 1);
        root.addView(title, new LinearLayout.LayoutParams(-1, -2));

        status = new TextView(this);
        status.setText("READY — grant location permission to scan");
        status.setTextColor(0xFF9CFFCC);
        status.setTextSize(13);
        status.setPadding(0, 18, 0, 12);
        root.addView(status);

        scanButton = new Button(this);
        scanButton.setText("SCAN ACCESS POINTS");
        scanButton.setTextColor(0xFF00FF88);
        scanButton.setOnClickListener(v -> startWifiScan());
        root.addView(scanButton, new LinearLayout.LayoutParams(-1, -2));

        TextView note = new TextView(this);
        note.setText("Visible APs only • passive analysis • RSSI is not exact distance");
        note.setTextColor(0xFF668877);
        note.setTextSize(11);
        note.setPadding(0, 10, 0, 10);
        root.addView(note);

        list = new LinearLayout(this);
        list.setOrientation(LinearLayout.VERTICAL);
        root.addView(list, new LinearLayout.LayoutParams(-1, 0, 1));
        setContentView(root);
    }

    private void ensurePermission() {
        if (android.os.Build.VERSION.SDK_INT >= 23 && checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION}, REQ_LOCATION);
        } else {
            startWifiScan();
        }
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grants) {
        super.onRequestPermissionsResult(requestCode, permissions, grants);
        if (requestCode == REQ_LOCATION && grants.length > 0 && grants[0] == PackageManager.PERMISSION_GRANTED) startWifiScan();
        else status.setText("PERMISSION REQUIRED — enable location access for Wi-Fi scan results");
    }

    private void startWifiScan() {
        if (wifi == null) { status.setText("Wi-Fi service unavailable"); return; }
        if (!wifi.isWifiEnabled()) {
            status.setText("Wi-Fi is OFF — enable Wi-Fi, then scan again");
            startActivity(new Intent(Settings.ACTION_WIFI_SETTINGS));
            return;
        }
        try {
            boolean started = wifi.startScan();
            status.setText(started ? "SCANNING… waiting for AP results" : "SCAN REQUEST REJECTED — showing latest results");
            if (!started) renderResults(false);
        } catch (SecurityException e) {
            status.setText("SCAN BLOCKED — location permission is required");
        }
    }

    private void renderResults(boolean fresh) {
        if (wifi == null) return;
        try {
            List<ScanResult> results = wifi.getScanResults();
            Collections.sort(results, new Comparator<ScanResult>() {
                @Override public int compare(ScanResult a, ScanResult b) { return Integer.compare(b.level, a.level); }
            });
            list.removeAllViews();
            status.setText(String.format(Locale.US, "%s • %d ACCESS POINTS", fresh ? "LIVE SCAN COMPLETE" : "LATEST RESULTS", results.size()));
            for (ScanResult r : results) addResult(r);
        } catch (SecurityException e) {
            status.setText("Cannot read scan results — permission denied");
        }
    }

    private void addResult(ScanResult r) {
        TextView row = new TextView(this);
        String ssid = r.SSID == null || r.SSID.length() == 0 ? "<HIDDEN SSID>" : r.SSID;
        String band = r.frequency >= 5925 ? "6 GHz" : (r.frequency >= 4900 ? "5 GHz" : "2.4 GHz");
        int pct = Math.max(0, Math.min(100, WifiManager.calculateSignalLevel(r.level, 101)));
        String security = r.capabilities == null ? "UNKNOWN" : r.capabilities;
        row.setText(String.format(Locale.US,
                "● %s  %d%%\n   RSSI %d dBm   CH %d   %s\n   %s\n   %s",
                ssid, pct, r.level, channel(r.frequency), band, r.BSSID, security));
        row.setTextColor(0xFFB8FFD8);
        row.setTextSize(12);
        row.setTypeface(android.graphics.Typeface.MONOSPACE);
        row.setPadding(14, 14, 10, 14);
        row.setBackgroundColor(0xFF0A110D);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, -2);
        lp.setMargins(0, 0, 0, 6);
        list.addView(row, lp);
    }

    private int channel(int frequency) {
        if (frequency >= 2412 && frequency <= 2484) return (frequency - 2407) / 5;
        if (frequency >= 5000 && frequency < 5925) return (frequency - 5000) / 5;
        if (frequency >= 5925) return (frequency - 5950) / 5;
        return 0;
    }

    @Override protected void onDestroy() {
        if (receiver != null) unregisterReceiver(receiver);
        super.onDestroy();
    }
}

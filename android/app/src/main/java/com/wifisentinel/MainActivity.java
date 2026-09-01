package com.wifisentinel;

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

public class MainActivity extends Activity {
    private static final int LOCATION_REQUEST = 1001;
    private WifiManager wifi;
    private LinearLayout list;
    private TextView status, count;
    private final BroadcastReceiver receiver = new BroadcastReceiver() {
        @Override public void onReceive(Context context, Intent intent) {
            if (WifiManager.SCAN_RESULTS_AVAILABLE_ACTION.equals(intent.getAction())) {
                boolean updated = intent.getBooleanExtra(WifiManager.EXTRA_RESULTS_UPDATED, false);
                showResults(updated);
            }
        }
    };

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        wifi = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
        list = findViewById(R.id.list); status = findViewById(R.id.status); count = findViewById(R.id.count);
        Button scan = findViewById(R.id.scanButton);
        scan.setOnClickListener(v -> requestScan());
        registerReceiver(receiver, new IntentFilter(WifiManager.SCAN_RESULTS_AVAILABLE_ACTION));
        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION}, LOCATION_REQUEST);
        } else requestScan();
    }

    private void requestScan() {
        if (!wifi.isWifiEnabled()) { status.setText("WIFI OFF • ENABLE WIFI TO SCAN"); return; }
        try {
            boolean started = wifi.startScan();
            status.setText(started ? "SCANNING • WAITING FOR RESULTS" : "SCAN REQUEST REJECTED • SHOWING LAST RESULTS");
            if (!started) showResults(false);
        } catch (SecurityException e) { status.setText("PERMISSION REQUIRED"); }
    }

    private void showResults(boolean fresh) {
        List<ScanResult> results;
        try { results = wifi.getScanResults(); } catch (SecurityException e) { status.setText("LOCATION PERMISSION REQUIRED"); return; }
        Collections.sort(results, new Comparator<ScanResult>() { public int compare(ScanResult a, ScanResult b) { return Integer.compare(b.level, a.level); }});
        list.removeAllViews();
        for (ScanResult r : results) {
            TextView row = new TextView(this);
            int pct = WifiManager.calculateSignalLevel(r.level, 101);
            String band = r.frequency >= 5925 ? "6 GHz" : (r.frequency >= 4900 ? "5 GHz" : "2.4 GHz");
            row.setText(String.format("%s\n%d dBm  •  %d%%  •  CH %d  •  %s\n%s\n",
                    r.SSID == null || r.SSID.length() == 0 ? "<hidden SSID>" : r.SSID,
                    r.level, pct, channel(r.frequency), band, r.BSSID));
            row.setTextColor(0xFF66FFAA); row.setTextSize(14); row.setPadding(10, 14, 10, 14);
            list.addView(row);
        }
        count.setText(results.size() + " APs detected");
        status.setText((fresh ? "SCAN COMPLETE" : "LAST AVAILABLE RESULTS") + " • SORTED BY SIGNAL");
    }

    private int channel(int f) {
        if (f >= 2412 && f <= 2484) return f == 2484 ? 14 : (f - 2407) / 5;
        if (f >= 5000 && f <= 5900) return (f - 5000) / 5;
        if (f >= 5925) return (f - 5950) / 5 + 1;
        return 0;
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grants) {
        super.onRequestPermissionsResult(requestCode, permissions, grants);
        if (requestCode == LOCATION_REQUEST && grants.length > 0 && grants[0] == PackageManager.PERMISSION_GRANTED) requestScan();
        else status.setText("LOCATION PERMISSION DENIED • AP SCANNING UNAVAILABLE");
    }

    @Override protected void onDestroy() {
        try { unregisterReceiver(receiver); } catch (Exception ignored) {}
        super.onDestroy();
    }
}

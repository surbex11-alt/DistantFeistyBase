package com.wifisentinel;

import android.Manifest;
import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Path;
import android.net.wifi.ScanResult;
import android.net.wifi.WifiManager;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Deque;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class MainActivity extends Activity {
    private static final int LOCATION_REQUEST = 1001;
    private WifiManager wifi;
    private LinearLayout list;
    private TextView status, count, selectedInfo, analysis;
    private SignalGraph graph;
    private final Map<String, Deque<Integer>> history = new HashMap<>();
    private String selectedBssid;
    private int referenceRssi = -45;
    private double pathLoss = 2.0;

    private final BroadcastReceiver receiver = new BroadcastReceiver() {
        @Override public void onReceive(Context context, Intent intent) {
            if (WifiManager.SCAN_RESULTS_AVAILABLE_ACTION.equals(intent.getAction())) {
                showResults(intent.getBooleanExtra(WifiManager.EXTRA_RESULTS_UPDATED, false));
            }
        }
    };

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        wifi = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
        list=findViewById(R.id.list); status=findViewById(R.id.status); count=findViewById(R.id.count);
        selectedInfo=findViewById(R.id.selectedInfo); analysis=findViewById(R.id.analysis); graph=findViewById(R.id.graph);
        findViewById(R.id.scanButton).setOnClickListener(v -> requestScan());
        findViewById(R.id.calibrateButton).setOnClickListener(v -> calibrateFromSelected());
        registerReceiver(receiver, new IntentFilter(WifiManager.SCAN_RESULTS_AVAILABLE_ACTION));
        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED)
            requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION}, LOCATION_REQUEST);
        else requestScan();
    }

    private void requestScan() {
        if (!wifi.isWifiEnabled()) { status.setText("WIFI OFF • ENABLE WIFI TO SCAN"); return; }
        try {
            boolean started=wifi.startScan();
            status.setText(started ? "SCANNING • WAITING FOR RESULTS" : "SCAN THROTTLED • SHOWING LAST RESULTS");
            if(!started) showResults(false);
        } catch(SecurityException e){ status.setText("LOCATION PERMISSION REQUIRED"); }
    }

    private void showResults(boolean fresh) {
        List<ScanResult> results;
        try { results=wifi.getScanResults(); } catch(SecurityException e){ status.setText("LOCATION PERMISSION REQUIRED"); return; }
        Collections.sort(results,(a,b)->Integer.compare(b.level,a.level)); list.removeAllViews(); ScanResult selected=null;
        for(ScanResult r:results){
            final ScanResult item=r; updateHistory(r.BSSID,r.level);
            TextView row=new TextView(this); int pct=signalPercent(r.level);
            row.setText(String.format(Locale.US,"%s\n%d dBm  •  %d%%  •  CH %d  •  %s\n%s",
                r.SSID==null||r.SSID.length()==0?"<hidden SSID>":r.SSID,r.level,pct,channel(r.frequency),band(r.frequency),r.BSSID));
            row.setTextColor(0xFF66FFAA); row.setTextSize(14); row.setPadding(10,14,10,14); row.setOnClickListener(v->selectAp(item)); list.addView(row);
            if(selectedBssid!=null&&selectedBssid.equals(r.BSSID)) selected=r;
        }
        count.setText(results.size()+" APs detected"); status.setText((fresh?"SCAN COMPLETE":"LAST AVAILABLE RESULTS")+" • SORTED BY SIGNAL");
        if(selected!=null) updateSelected(selected); else if(selectedBssid==null&&!results.isEmpty()) selectAp(results.get(0));
    }

    private void selectAp(ScanResult r){selectedBssid=r.BSSID;updateSelected(r);}
    private void updateSelected(ScanResult r){
        int pct=signalPercent(r.level); double meters=estimateDistance(r.level); Deque<Integer> h=history.get(r.BSSID); double avg=average(h),sd=stddev(h,avg);
        selectedInfo.setText(String.format(Locale.US,"SELECTED AP\n%s\nRSSI %d dBm  •  %d%%\nCH %d  •  %s\nEST. RANGE %.1f m\nCONFIDENCE %s",
            r.SSID==null||r.SSID.length()==0?"<hidden SSID>":r.SSID,r.level,pct,channel(r.frequency),band(r.frequency),meters,confidence(sd,h==null?0:h.size())));
        analysis.setText(String.format(Locale.US,"SIGNAL ANALYSIS\nAverage %.1f dBm\nVariation %.1f dB\nTrend %s\nCalibration RSSI %d dBm @ 1m\nPath-loss factor %.1f",
            avg,sd,trend(h),referenceRssi,pathLoss)); graph.setValues(h);
    }
    private void updateHistory(String bssid,int rssi){Deque<Integer> h=history.get(bssid);if(h==null){h=new ArrayDeque<>();history.put(bssid,h);}if(h.size()>=30)h.removeFirst();h.addLast(rssi);}
    private void calibrateFromSelected(){
        if(selectedBssid==null){status.setText("SELECT AN AP FIRST");return;} Deque<Integer> h=history.get(selectedBssid);if(h==null||h.isEmpty()){status.setText("NO RSSI SAMPLE AVAILABLE");return;}
        referenceRssi=(int)Math.round(average(h)); status.setText("CALIBRATED • CURRENT RSSI TREATED AS 1 m REFERENCE"); for(ScanResult r:wifi.getScanResults())if(selectedBssid.equals(r.BSSID)){updateSelected(r);break;}
    }
    private double estimateDistance(int rssi){return Math.pow(10.0,(referenceRssi-rssi)/(10.0*pathLoss));}
    private String confidence(double sd,int n){if(n<5)return "LOW";if(sd<=2.5)return "HIGH";if(sd<=5)return "MEDIUM";return "LOW";}
    private double average(Deque<Integer> h){if(h==null||h.isEmpty())return 0;double s=0;for(int v:h)s+=v;return s/h.size();}
    private double stddev(Deque<Integer> h,double avg){if(h==null||h.size()<2)return 0;double s=0;for(int v:h)s+=(v-avg)*(v-avg);return Math.sqrt(s/h.size());}
    private String trend(Deque<Integer> h){if(h==null||h.size()<3)return "INSUFFICIENT DATA";Integer[] a=h.toArray(new Integer[0]);double d=a[a.length-1]-a[Math.max(0,a.length-4)];return d>2?"↗ IMPROVING":d<-2?"↘ WEAKENING":"→ STABLE";}
    private int signalPercent(int rssi){return Math.max(0,Math.min(100,(rssi+100)*100/60));}
    private String band(int f){return f>=5925?"6 GHz":(f>=4900?"5 GHz":"2.4 GHz");}
    private int channel(int f){if(f>=2412&&f<=2484)return f==2484?14:(f-2407)/5;if(f>=5000&&f<=5900)return(f-5000)/5;if(f>=5925)return(f-5950)/5+1;return 0;}
    @Override public void onRequestPermissionsResult(int c,String[] p,int[] g){super.onRequestPermissionsResult(c,p,g);if(c==LOCATION_REQUEST&&g.length>0&&g[0]==PackageManager.PERMISSION_GRANTED)requestScan();else status.setText("LOCATION PERMISSION DENIED • AP SCANNING UNAVAILABLE");}
    @Override protected void onDestroy(){try{unregisterReceiver(receiver);}catch(Exception ignored){}super.onDestroy();}

    public static class SignalGraph extends View{
        private final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);private final Path path=new Path();private List<Integer> values=new ArrayList<>();
        public SignalGraph(Context c){super(c);paint.setStrokeWidth(3);paint.setStyle(Paint.Style.STROKE);paint.setColor(0xFF66FFAA);}
        public void setValues(Deque<Integer> h){values=h==null?new ArrayList<>():new ArrayList<>(h);invalidate();}
        @Override protected void onDraw(Canvas c){super.onDraw(c);c.drawColor(0xFF07100D);if(values.size()<2)return;path.reset();float w=getWidth(),ht=getHeight();for(int i=0;i<values.size();i++){float x=w*i/(float)(values.size()-1);float y=ht-(values.get(i)+100)*ht/80f;if(i==0)path.moveTo(x,y);else path.lineTo(x,y);}c.drawPath(path,paint);}
    }
}

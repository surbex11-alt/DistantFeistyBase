package com.wifisentinel;

import android.Manifest;
import android.app.Activity;
import android.content.*;
import android.content.pm.PackageManager;
import android.graphics.*;
import android.net.wifi.ScanResult;
import android.net.wifi.WifiManager;
import android.os.Bundle;
import android.view.View;
import android.widget.*;
import java.util.*;

public class MainActivity extends Activity {
    private static final int LOCATION_REQUEST=1001;
    private WifiManager wifi; private LinearLayout list; private TextView status,count,selectedInfo,analysis,channels;
    private SignalGraph graph; private RadarView radar; private final Map<String,Deque<Integer>> history=new HashMap<>();
    private String selectedBssid; private int referenceRssi=-45; private double pathLoss=2.0;
    private final BroadcastReceiver receiver=new BroadcastReceiver(){public void onReceive(Context c,Intent i){if(WifiManager.SCAN_RESULTS_AVAILABLE_ACTION.equals(i.getAction()))showResults(i.getBooleanExtra(WifiManager.EXTRA_RESULTS_UPDATED,false));}};

    @Override protected void onCreate(Bundle b){super.onCreate(b);setContentView(R.layout.activity_main); wifi=(WifiManager)getApplicationContext().getSystemService(Context.WIFI_SERVICE);
        list=findViewById(R.id.list);status=findViewById(R.id.status);count=findViewById(R.id.count);selectedInfo=findViewById(R.id.selectedInfo);analysis=findViewById(R.id.analysis);channels=findViewById(R.id.channels);graph=findViewById(R.id.graph);radar=findViewById(R.id.radar);
        findViewById(R.id.scanButton).setOnClickListener(v->requestScan());findViewById(R.id.calibrateButton).setOnClickListener(v->calibrateFromSelected());
        registerReceiver(receiver,new IntentFilter(WifiManager.SCAN_RESULTS_AVAILABLE_ACTION));
        if(checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)!=PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION},LOCATION_REQUEST);else requestScan(); }
    private void requestScan(){if(!wifi.isWifiEnabled()){status.setText("WIFI OFF • ENABLE WIFI TO SCAN");return;}try{boolean s=wifi.startScan();status.setText(s?"SCANNING • RADAR ONLINE":"SCAN THROTTLED • LAST RESULTS");if(!s)showResults(false);}catch(SecurityException e){status.setText("LOCATION PERMISSION REQUIRED");}}
    private void showResults(boolean fresh){List<ScanResult> rs;try{rs=wifi.getScanResults();}catch(SecurityException e){status.setText("LOCATION PERMISSION REQUIRED");return;}Collections.sort(rs,(a,b)->Integer.compare(b.level,a.level));list.removeAllViews();
        for(ScanResult r:rs){updateHistory(r.BSSID,r.level);TextView row=new TextView(this);row.setText(String.format(Locale.US,"%s\n%d dBm • %d%% • CH %d • %s\n%s",name(r),r.level,signalPercent(r.level),channel(r.frequency),band(r.frequency),r.BSSID));row.setTextColor(0xFF66FFAA);row.setTextSize(14);row.setPadding(10,12,10,12);row.setOnClickListener(v->selectAp(r));list.addView(row);}
        count.setText(rs.size()+" APs detected");status.setText((fresh?"SCAN COMPLETE":"LAST AVAILABLE RESULTS")+" • RADAR UPDATED");radar.setResults(rs);updateChannels(rs);if(selectedBssid!=null){for(ScanResult r:rs)if(selectedBssid.equals(r.BSSID)){updateSelected(r);break;}}else if(!rs.isEmpty())selectAp(rs.get(0));}
    private String name(ScanResult r){return r.SSID==null||r.SSID.length()==0?"<hidden SSID>":r.SSID;}
    private void selectAp(ScanResult r){selectedBssid=r.BSSID;updateSelected(r);}
    private void updateSelected(ScanResult r){Deque<Integer> h=history.get(r.BSSID);double avg=average(h),sd=stddev(h,avg);selectedInfo.setText(String.format(Locale.US,"SELECTED AP\n%s\nRSSI %d dBm • %d%%\nCH %d • %s\nEST. RANGE %.1f m\nCONFIDENCE %s",name(r),r.level,signalPercent(r.level),channel(r.frequency),band(r.frequency),estimateDistance(r.level),confidence(sd,h==null?0:h.size())));analysis.setText(String.format(Locale.US,"SIGNAL ANALYSIS\nAverage %.1f dBm\nVariation %.1f dB\nTrend %s\nCalibration %d dBm @ 1m\nPath-loss %.1f",avg,sd,trend(h),referenceRssi,pathLoss));graph.setValues(h);}
    private void updateHistory(String b,int v){Deque<Integer> h=history.get(b);if(h==null){h=new ArrayDeque<>();history.put(b,h);}if(h.size()>=30)h.removeFirst();h.addLast(v);}
    private void calibrateFromSelected(){if(selectedBssid==null){status.setText("SELECT AN AP FIRST");return;}Deque<Integer> h=history.get(selectedBssid);if(h==null||h.isEmpty()){status.setText("NO RSSI SAMPLE");return;}referenceRssi=(int)Math.round(average(h));status.setText("CALIBRATED • SELECTED AP = 1m REFERENCE");try{for(ScanResult r:wifi.getScanResults())if(selectedBssid.equals(r.BSSID)){updateSelected(r);break;}}catch(Exception ignored){}}
    private double estimateDistance(int r){return Math.pow(10.0,(referenceRssi-r)/(10.0*pathLoss));}
    private String confidence(double sd,int n){if(n<5)return "LOW";if(sd<=2.5)return "HIGH";if(sd<=5)return "MEDIUM";return "LOW";}
    private double average(Deque<Integer> h){if(h==null||h.isEmpty())return 0;double s=0;for(int v:h)s+=v;return s/h.size();}
    private double stddev(Deque<Integer> h,double a){if(h==null||h.size()<2)return 0;double s=0;for(int v:h)s+=(v-a)*(v-a);return Math.sqrt(s/h.size());}
    private String trend(Deque<Integer> h){if(h==null||h.size()<3)return "INSUFFICIENT DATA";Integer[] a=h.toArray(new Integer[0]);double d=a[a.length-1]-a[Math.max(0,a.length-4)];return d>2?"↗ IMPROVING":d<-2?"↘ WEAKENING":"→ STABLE";}
    private int signalPercent(int r){return Math.max(0,Math.min(100,(r+100)*100/60));}
    private String band(int f){return f>=5925?"6 GHz":f>=4900?"5 GHz":"2.4 GHz";}
    private int channel(int f){if(f>=2412&&f<=2484)return f==2484?14:(f-2407)/5;if(f>=5000&&f<=5900)return(f-5000)/5;if(f>=5925)return(f-5950)/5+1;return 0;}
    private void updateChannels(List<ScanResult> rs){int[] c=new int[234];for(ScanResult r:rs){int ch=channel(r.frequency);if(ch>0&&ch<c.length)c[ch]++;}StringBuilder s=new StringBuilder("CHANNEL ANALYZER\n");int max=0;for(int i=1;i<c.length;i++)max=Math.max(max,c[i]);for(int i=1;i<c.length;i++)if(c[i]>0)s.append(String.format(Locale.US,"CH %-3d ",i)).append(bar(c[i],max)).append(" ").append(c[i]).append(" AP\n");channels.setText(s.toString());}
    private String bar(int v,int max){int n=max==0?0:Math.max(1,(v*12)/max);StringBuilder s=new StringBuilder();for(int i=0;i<n;i++)s.append("█");return s.toString();}
    @Override public void onRequestPermissionsResult(int c,String[] p,int[] g){super.onRequestPermissionsResult(c,p,g);if(c==LOCATION_REQUEST&&g.length>0&&g[0]==PackageManager.PERMISSION_GRANTED)requestScan();else status.setText("LOCATION PERMISSION DENIED");}
    @Override protected void onDestroy(){try{unregisterReceiver(receiver);}catch(Exception ignored){}super.onDestroy();}

    public static class SignalGraph extends View{private final Paint p=new Paint(1);private final Path path=new Path();private List<Integer> v=new ArrayList<>();public SignalGraph(Context c){super(c);p.setStrokeWidth(3);p.setStyle(Paint.Style.STROKE);p.setColor(0xFF66FFAA);}public void setValues(Deque<Integer> h){v=h==null?new ArrayList<>():new ArrayList<>(h);invalidate();}@Override protected void onDraw(Canvas c){c.drawColor(0xFF07100D);if(v.size()<2)return;path.reset();float w=getWidth(),h=getHeight();for(int i=0;i<v.size();i++){float x=w*i/(float)(v.size()-1),y=h-(v.get(i)+100)*h/80f;if(i==0)path.moveTo(x,y);else path.lineTo(x,y);}c.drawPath(path,p);}}

    public static class RadarView extends View{private final Paint p=new Paint(1);private final List<ScanResult> results=new ArrayList<>();private float sweep=0;public RadarView(Context c){super(c);p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(2);}public void setResults(List<ScanResult> r){results.clear();results.addAll(r);invalidate();}protected void onDraw(Canvas c){super.onDraw(c);c.drawColor(0xFF030604);float cx=getWidth()/2f,cy=getHeight()/2f,rad=Math.min(cx,cy)-12;p.setColor(0xFF185C38);for(int i=1;i<=3;i++)c.drawCircle(cx,cy,rad*i/3,p);c.drawLine(cx-rad,cy,cx+rad,cy,p);c.drawLine(cx,cy-rad,cx,cy+rad,p);p.setColor(0xFF00FF66);c.drawCircle(cx,cy,5,p);for(int i=0;i<results.size();i++){ScanResult r=results.get(i);double a=i*2.39996;float strength=Math.max(0,Math.min(1,(r.level+100)/60f));float rr=rad*(0.25f+0.7f*(1-strength));float x=cx+(float)Math.cos(a)*rr,y=cy+(float)Math.sin(a)*rr;p.setStyle(Paint.Style.FILL);c.drawCircle(x,y,Math.max(4,8*strength),p);}p.setStyle(Paint.Style.STROKE);sweep+=0.035f;if(sweep>Math.PI*2)sweep=0;c.drawArc(cx-rad,cy-rad,cx+rad,cy+rad,(float)Math.toDegrees(sweep),18,false,p);postInvalidateDelayed(35);}}
}

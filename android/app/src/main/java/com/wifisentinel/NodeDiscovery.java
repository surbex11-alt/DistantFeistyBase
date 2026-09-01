package com.wifisentinel;

import java.net.InetAddress;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Explicit, user-started discovery helper. It probes only a caller-supplied local subnet/host list. */
public final class NodeDiscovery {
    private final ExecutorService pool=Executors.newSingleThreadExecutor();
    public interface Listener { void onHost(String host); }
    public void probe(List<String> hosts, int port, Listener listener) {
        pool.execute(() -> { for(String host:new ArrayList<>(hosts)) { try { InetAddress a=InetAddress.getByName(host); if(a.isReachable(500) && listener!=null) listener.onHost(host); } catch(Exception ignored){} } });
    }
    public void close(){pool.shutdownNow();}
}

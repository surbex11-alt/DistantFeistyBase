package com.wifisentinel;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** In-memory registry for cooperating sensing nodes. */
public final class NodeRegistry {
    public static final class Node {
        public final String id;
        public final String name;
        public long lastSeen;
        public int rssi;
        public boolean online;
        public Node(String id, String name) { this.id=id; this.name=name; this.lastSeen=System.currentTimeMillis(); }
    }
    private final Map<String, Node> nodes = new LinkedHashMap<>();
    public synchronized void upsert(String id, String name, int rssi) {
        Node n=nodes.get(id); if(n==null){n=new Node(id,name);nodes.put(id,n);} n.rssi=rssi;n.lastSeen=System.currentTimeMillis();n.online=true;
    }
    public synchronized void markStale(long timeoutMs) {
        long now=System.currentTimeMillis(); for(Node n:nodes.values()) n.online=now-n.lastSeen<=timeoutMs;
    }
    public synchronized List<Node> snapshot(){return Collections.unmodifiableList(new ArrayList<>(nodes.values()));}
}

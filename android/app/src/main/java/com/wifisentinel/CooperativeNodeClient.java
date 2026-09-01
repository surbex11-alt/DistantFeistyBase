package com.wifisentinel;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.Socket;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Sends one measurement to a coordinator on the same LAN. No internet dependency. */
public final class CooperativeNodeClient {
    private final ExecutorService pool=Executors.newSingleThreadExecutor();
    public interface Callback { void onResult(boolean ok, String response); }
    public void send(String host, int port, String json, Callback cb) {
        pool.execute(() -> {
            boolean ok=false; String response="";
            try(Socket s=new Socket(host,port); PrintWriter out=new PrintWriter(s.getOutputStream(),true); BufferedReader in=new BufferedReader(new InputStreamReader(s.getInputStream()))) {
                out.println(json); response=in.readLine(); ok="OK".equals(response);
            } catch(Exception e){ response=e.getClass().getSimpleName(); }
            if(cb!=null) cb.onResult(ok,response);
        });
    }
    public void close(){pool.shutdownNow();}
}

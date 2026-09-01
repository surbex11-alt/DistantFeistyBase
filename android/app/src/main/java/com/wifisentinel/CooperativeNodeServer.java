package com.wifisentinel;

import android.os.Handler;
import android.os.Looper;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Lightweight LAN-only measurement endpoint. Start explicitly from the app; no internet service. */
public final class CooperativeNodeServer {
    public interface Listener { void onMeasurement(String json, String host); }
    private final ExecutorService pool = Executors.newCachedThreadPool();
    private final Handler main = new Handler(Looper.getMainLooper());
    private volatile boolean running;
    private ServerSocket server;

    public void start(final int port, final Listener listener) throws IOException {
        if (running) return;
        server = new ServerSocket(port);
        running = true;
        pool.execute(() -> {
            while (running) {
                try {
                    final Socket s = server.accept();
                    pool.execute(() -> handle(s, listener));
                } catch (IOException ignored) { if (running) main.post(() -> { }); }
            }
        });
    }

    private void handle(Socket socket, Listener listener) {
        try (Socket s=socket; BufferedReader in=new BufferedReader(new InputStreamReader(s.getInputStream())); PrintWriter out=new PrintWriter(s.getOutputStream(), true)) {
            String line=in.readLine();
            if (line != null && listener != null) {
                final String payload=line; final String host=s.getInetAddress().getHostAddress();
                main.post(() -> listener.onMeasurement(payload, host));
            }
            out.println("OK");
        } catch (IOException ignored) { }
    }

    public void stop() {
        running=false;
        try { if(server!=null) server.close(); } catch(IOException ignored) { }
        pool.shutdownNow();
    }
}

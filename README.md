# WiFi Sentinel — Network Intelligence & Tactical Radar

A web-based Wi-Fi access point radar scanner, signal strength analyzer, channel spectrum congestion visualizer, and cooperative sensing node coordinator ported to modern React and TypeScript.

## Features

- **360° Tactical Radar Scope**: Real-time rotating radar sweep display mapping all detected Wi-Fi Access Points radially based on RSSI signal strength and calculated distance.
- **Detailed AP Inspector & Waveform Graph**: Live statistical signal telemetry (Average dBm, StdDev variation, Signal Trend, Confidence score), 30-sample rolling RF waveform chart, and 1-meter reference calibration tool.
- **Log-Distance Path-Loss Estimation**: Configurable path-loss attenuation exponent ($n = 1.6 - 4.0$) for distance ranging calculations.
- **Channel Spectrum Congestion Analyzer**: Interactive multi-band spectrum visualizer (2.4 GHz, 5 GHz, 6 GHz) with congestion ranking and non-overlapping channel recommendations.
- **Cooperative Sentinel Mesh**: Distributed sensing mesh architecture supporting autonomous sensing node registration, LAN measurement packet streaming, and subnet probing.
- **RF Security & Encryption Audit**: Passive classification of WPA3-SAE, WPA2-PSK, WPA legacy, WEP, and unencrypted open networks, plus multi-BSSID/evil-twin detection.
- **Flexible Network Environments & Custom Ingestion**: Switch between enterprise campus, dense downtown cafe, and multi-floor smart home presets, or inject custom beacons.

# WiFi Sentinel Android AP Scanner

Lightweight native Android Wi-Fi scanner for Android 8.1 / API 27 and newer.

## First working feature
- Real `WifiManager.startScan()` requests
- `SCAN_RESULTS_AVAILABLE_ACTION` result handling
- SSID and BSSID
- RSSI (dBm)
- Signal percentage
- Channel and band
- Frequency
- Security/capability string
- Strongest APs first
- Dark cyber-style UI

## OPPO / Android 8.1 notes
The app requests coarse/fine location because Android 8.0/8.1 requires location permission (or CHANGE_WIFI_STATE under the documented API behavior) to read Wi-Fi scan results. Wi-Fi must be enabled. Scan frequency is controlled by Android/device policy; repeated rapid scans should not be assumed to succeed.

## Safety/privacy
The scanner only reads access points visible to the phone. It does not retrieve Wi-Fi passwords, bypass authentication, or attempt unauthorized access.

## Build
Open the repository root in Android Studio and run the `app` configuration. Minimum API 27; target API 28 for the first OPPO/Android 8.1-focused build.

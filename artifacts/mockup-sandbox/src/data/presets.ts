import { NetworkEnvironmentPreset, WifiScanResult } from '../types/wifi';
import { calculateChannel, calculateBand, calculateSignalPercent } from '../utils/wifiCalculations';

function createAp(
  ssid: string,
  bssid: string,
  level: number,
  frequency: number,
  capabilities: string,
  vendor?: string
): WifiScanResult {
  return {
    ssid,
    bssid,
    level,
    frequency,
    capabilities,
    timestamp: Date.now(),
    channel: calculateChannel(frequency),
    band: calculateBand(frequency),
    signalPercent: calculateSignalPercent(level),
    vendor: vendor || 'Unknown Vendor',
  };
}

export const ENVIRONMENT_PRESETS: NetworkEnvironmentPreset[] = [
  {
    id: 'cyber-office',
    name: 'Enterprise Tech Campus',
    description: 'Multi-AP enterprise deployment with 6GHz WiFi 6E, 5GHz mesh, and IoT segregation.',
    environmentNoise: 2.2,
    defaultPathLoss: 2.4,
    initialAps: [
      createAp('CyberCore-Corp-5G', '74:83:C2:11:9A:01', -42, 5180, '[WPA3-SAE-CCMP][WPA2-PSK-CCMP][ESS]', 'Cisco Meraki'),
      createAp('CyberCore-Corp-6G', '74:83:C2:11:9A:02', -49, 5975, '[WPA3-SAE-CCMP][ESS]', 'Cisco Meraki'),
      createAp('CyberCore-Guest', '74:83:C2:11:9A:03', -58, 2437, '[WPA2-PSK-CCMP][ESS]', 'Cisco Meraki'),
      createAp('IoT-Secure-Sensors', '18:E8:29:44:81:BB', -64, 2412, '[WPA2-PSK-CCMP][ESS]', 'Aruba Networks'),
      createAp('AlphaLab-Private', 'D8:07:B6:3E:99:F1', -52, 5500, '[WPA3-Enterprise-EAP][ESS]', 'Ubiquiti Networks'),
      createAp('Executive-Direct', '30:23:03:78:41:A0', -68, 5240, '[WPA3-SAE-CCMP][ESS]', 'Fortinet'),
      createAp('<hidden SSID>', 'E0:63:DA:88:1C:32', -74, 2462, '[WPA2-PSK-CCMP][ESS]', 'Ruckus Wireless'),
      createAp('Conference_Room_A', '58:6D:8F:22:9D:44', -61, 5745, '[WPA2-PSK-CCMP][ESS]', 'Aruba Networks'),
      createAp('Building_Management_Net', '9C:35:EB:10:72:6E', -79, 2412, '[WPA-TKIP][ESS]', 'MikroTik'),
      createAp('Open_Visitor_WiFi', 'AA:BB:CC:DD:EE:01', -83, 2437, '[ESS]', 'Public Hotspot'),
    ],
  },
  {
    id: 'urban-cafe',
    name: 'Dense Downtown Cafe',
    description: 'High-density radio frequency spectrum with channel congestion on 2.4 GHz band.',
    environmentNoise: 3.5,
    defaultPathLoss: 2.8,
    initialAps: [
      createAp('BrewLab_Free_WiFi', '44:65:7D:55:01:8A', -38, 2412, '[ESS]', 'Netgear Nighthawk'),
      createAp('BrewLab_5GHz_HighSpeed', '44:65:7D:55:01:8B', -45, 5200, '[WPA2-PSK-CCMP][ESS]', 'Netgear Nighthawk'),
      createAp('Metro-Transit-Free', '22:8A:4C:19:62:3B', -72, 2412, '[ESS]', 'City Mesh'),
      createAp('Apartment_4B_Private', '00:1F:33:9A:88:CC', -67, 2437, '[WPA2-PSK-CCMP][ESS]', 'TP-Link Archer'),
      createAp('CoffeeLovers-Staff', '44:65:7D:55:01:8C', -50, 5785, '[WPA3-SAE-CCMP][ESS]', 'Netgear Nighthawk'),
      createAp('NextDoor_Bistro_Guest', 'F4:F2:6D:33:10:90', -76, 2437, '[WPA2-PSK-CCMP][ESS]', 'Asus RT-AX88U'),
      createAp('DentistOffice_Secure', 'BC:CF:4F:91:02:11', -81, 5180, '[WPA2-PSK-CCMP][ESS]', 'Linksys Velop'),
      createAp('xfinitywifi', '00:1E:58:AA:BB:CC', -86, 2462, '[ESS]', 'Comcast/Xfinity'),
    ],
  },
  {
    id: 'smart-home',
    name: 'Multi-Floor Smart Home',
    description: 'Tri-band Wi-Fi 7 mesh system with smart home appliances and wireless backhaul.',
    environmentNoise: 1.8,
    defaultPathLoss: 3.0,
    initialAps: [
      createAp('Apex_Mesh_LivingRoom', '60:BE:B5:12:34:01', -35, 5220, '[WPA3-SAE-CCMP][ESS]', 'ASUS ROG Rapture'),
      createAp('Apex_Mesh_6GHz_Backhaul', '60:BE:B5:12:34:02', -46, 6115, '[WPA3-SAE-CCMP][ESS]', 'ASUS ROG Rapture'),
      createAp('Apex_SmartHome_2G', '60:BE:B5:12:34:03', -48, 2437, '[WPA2-PSK-CCMP][ESS]', 'ASUS ROG Rapture'),
      createAp('Smart_Fridge_Display', 'B8:27:EB:7A:41:99', -65, 2412, '[WPA2-PSK-CCMP][ESS]', 'Raspberry Pi / Samsung'),
      createAp('Sonos_Living_Sound', '00:0E:58:22:98:A1', -58, 2412, '[WPA2-PSK-CCMP][ESS]', 'Sonos Inc'),
      createAp('SolarInverter_Direct', '70:B3:D5:19:00:23', -78, 2462, '[WPA2-PSK-CCMP][ESS]', 'Enphase Energy'),
      createAp('Neighbor_5G_Ext', '94:10:3E:88:99:00', -84, 5240, '[WPA2-PSK-CCMP][ESS]', 'Google Nest Wifi'),
    ],
  },
];

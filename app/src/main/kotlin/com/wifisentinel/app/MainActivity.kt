package com.wifisentinel.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import com.wifisentinel.app.ui.theme.WifiSentinelTheme
import dagger.hilt.android.AndroidEntryPoint

/**
 * MainActivity - Entry point for the WiFi Sentinel application
 * 
 * This activity serves as the main UI container for the app,
 * displaying the Wi-Fi scanning, signal analysis, and network coordination features.
 */
@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            WifiSentinelTheme {
                // A surface container using the 'background' color from the theme
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    WifiSentinelApp()
                }
            }
        }
    }
}

/**
 * Main composable for the WiFi Sentinel app
 * Displays the Wi-Fi access point radar scanner and signal strength analyzer
 */
@Composable
fun WifiSentinelApp() {
    Text(
        text = "WiFi Sentinel - Tactical Wi-Fi Scanner",
        style = MaterialTheme.typography.headlineMedium
    )
}

@Preview(showBackground = true)
@Composable
fun WifiSentinelAppPreview() {
    WifiSentinelTheme {
        WifiSentinelApp()
    }
}

# This is a configuration file for ProGuard.
# http://proguard.sourceforge.net/index.html#manual/usage.html

-dontusemixedcaseclassnames
-verbose

# Optimization is turned off by default. Dontoptimize if you want to
# turn it on, use the flag -optimizationpasses n.
-dontoptimize

# If you want to completely disable the warnings from unused entries, you can
# specify the -dontwarn option with a wildcard:
-dontwarn **

# Preserve line numbers for debugging stack traces
-keepattributes SourceFile,LineNumberTable

# Keep the line numbers and file name attributes so that the stack traces
# are more readable
-renamesourcefileattribute SourceFile

# Keep all the Android support libraries
-keep class androidx.** { *; }
-keep interface androidx.** { *; }

# Keep all public classes and methods
-keepclasseswithmembernames class * {
    public <init>(...);
}

# Keep enums
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Keep Parcelable classes
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# Keep native methods
-keepclasseswithmethodnames class * {
    native <methods>;
}

# Keep view constructors for inflation from XML
-keepclasseswithmembers class * {
    public <init>(android.content.Context, android.util.AttributeSet);
}

# Keep onClick listeners
-keepclassmembers class * extends android.view.View {
    public void on*(android.view.View);
}

# Keep Activity, Service, BroadcastReceiver, ContentProvider constructors
-keepclasseswithmembers class * extends android.app.Activity {
    public <init>(android.content.Context);
}

-keepclasseswithmembers class * extends android.app.Service {
    public <init>(android.content.Context);
}

-keepclasseswithmembers class * extends android.content.BroadcastReceiver {
    public <init>(android.content.Context);
}

-keepclasseswithmembers class * extends android.content.ContentProvider {
    public <init>(android.content.Context);
}

# Keep Fragment constructors
-keepclasseswithmembers class * extends androidx.fragment.app.Fragment {
    public <init>(android.content.Context);
    public <init>();
}

# Keep custom application classes
-keep class * extends android.app.Application {
    public <init>();
}

# Keep WiFi Sentinel app classes
-keep class com.wifisentinel.app.** { *; }
-keep interface com.wifisentinel.app.** { *; }

# Keep data classes with @Entity, @Dao, @Database annotations (Room)
-keepclassmembers class * {
    @androidx.room.* <fields>;
    @androidx.room.* <methods>;
}

-keep class * extends androidx.room.RoomDatabase {
    public abstract ** *(...);
}

# Keep Hilt generated classes
-keep class **_MembersInjector { *; }
-keep class **_Factory { *; }
-keep class **_Provide* { *; }
-keep class dagger.hilt.** { *; }
-keep interface dagger.hilt.** { *; }

# Keep Retrofit interfaces
-keepattributes Signature
-keepattributes *Annotation*
-keep class retrofit2.** { *; }
-keep interface retrofit2.** { *; }
-keep class com.squareup.okhttp3.** { *; }
-keep interface com.squareup.okhttp3.** { *; }

# Keep Gson classes
-keep class com.google.gson.** { *; }
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer

# Keep data classes and their members
-keep class com.wifisentinel.app.data.** { *; }
-keep class com.wifisentinel.app.domain.** { *; }
-keep class com.wifisentinel.app.model.** { *; }

# Keep Model classes that might be serialized
-keepclassmembers class * {
    *** get*();
    void set*(***);
}

# Preserve BuildConfig
-keep class **.BuildConfig { *; }

# Preserve R classes
-keepclassmembers class **.R$* {
    public static <fields>;
}

# Keep Compose classes
-keep class androidx.compose.** { *; }
-keep interface androidx.compose.** { *; }

# Keep Lifecycle classes
-keep class androidx.lifecycle.** { *; }
-keep interface androidx.lifecycle.** { *; }

# Optimization flags
-optimizationpasses 5
-dontskipnonpubliclibraryclassmembers

# Obfuscation
-repackageclasses 'com.wifisentinel.obfuscated'
-obfuscationdictionary proguard-dictionary.txt

# Remove logging in release builds
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}

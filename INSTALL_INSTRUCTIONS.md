# Installing APK on Your Tablet via Vysor

## Current Status
- ✅ ADB found and ready
- ❌ Device not yet connected via ADB
- ❌ APK build has C++ linking issues (react-native-screens with NDK 27)

## Steps to Connect Your Tablet

### Option 1: Via Vysor (Recommended)
1. **Enable USB Debugging on your tablet:**
   - Go to Settings → About Phone/Tablet
   - Tap "Build Number" 7 times to enable Developer Options
   - Go to Settings → Developer Options
   - Enable "USB Debugging"

2. **Connect via Vysor:**
   - Open Vysor on your computer
   - Connect your tablet (via USB or wireless)
   - Ensure the device appears in Vysor

3. **Verify ADB Connection:**
   ```powershell
   .\install-apk.ps1
   ```
   Or manually:
   ```powershell
   & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices
   ```

### Option 2: Direct USB Connection
1. Connect tablet via USB cable
2. Enable USB Debugging (see above)
3. Accept the "Allow USB Debugging" prompt on your tablet
4. Run `adb devices` to verify

## Installing an APK

### If you already have an APK file:
```powershell
.\install-apk.ps1 -ApkPath "path\to\your\app.apk"
```

### If you need to build the APK:
The current build is failing due to C++ linking issues with `react-native-screens` and NDK 27. 

**Temporary workaround options:**
1. **Use React Native CLI** (may handle build differently):
   ```powershell
   npm run android
   ```

2. **Downgrade NDK** (if possible):
   - Change NDK version in `android/build.gradle` to a compatible version (e.g., 26.x)

3. **Build without react-native-screens** (temporary):
   - Comment out react-native-screens temporarily to test

## Troubleshooting

### Device not showing in `adb devices`:
- Restart ADB server: `adb kill-server && adb start-server`
- Check USB cable connection
- Try different USB port
- Revoke USB debugging authorizations on tablet and reconnect

### Installation fails:
- Try: `adb install -r -d "path\to\apk"`
- Check if app is already installed: `adb uninstall com.sartesalon`
- Ensure tablet has enough storage space

## Quick Install Command
Once device is connected and you have an APK:
```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r "path\to\app.apk"
```




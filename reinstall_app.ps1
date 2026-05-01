
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
if (-not (Test-Path $adb)) {
    Write-Host "ADB not found at $adb"
    exit 1
}

Write-Host "Checking devices..."
& $adb devices -l

Write-Host "Uninstalling com.sartesalon..."
& $adb uninstall com.sartesalon

Write-Host "Installing APK..."
$apk = "android\app\build\outputs\apk\debug\app-debug.apk"
if (-not (Test-Path $apk)) {
    Write-Host "APK not found at $apk"
    exit 1
}

& $adb install -r $apk

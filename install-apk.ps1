# Script to install APK on Android device via ADB
# Usage: .\install-apk.ps1 -ApkPath "path\to\your\app.apk"

param(
    [Parameter(Mandatory=$false)]
    [string]$ApkPath = ""
)

$adbPath = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"

if (-not (Test-Path $adbPath)) {
    Write-Host "ADB not found at: $adbPath" -ForegroundColor Red
    Write-Host "Please ensure Android SDK Platform Tools are installed." -ForegroundColor Yellow
    exit 1
}

Write-Host "Checking for connected devices..." -ForegroundColor Cyan
$devices = & $adbPath devices

if ($devices -match "device$") {
    Write-Host "Device found!" -ForegroundColor Green
    
    if ([string]::IsNullOrEmpty($ApkPath)) {
        # Try to find APK in common locations
        $possiblePaths = @(
            "android\app\build\outputs\apk\debug\app-debug.apk",
            "android\app\build\outputs\apk\release\app-release.apk",
            "*.apk"
        )
        
        Write-Host "`nSearching for APK files..." -ForegroundColor Cyan
        $apkFiles = Get-ChildItem -Path . -Recurse -Filter "*.apk" -ErrorAction SilentlyContinue | Select-Object -First 5
        
        if ($apkFiles.Count -eq 0) {
            Write-Host "No APK file found. Please provide the path to your APK file." -ForegroundColor Yellow
            Write-Host "Usage: .\install-apk.ps1 -ApkPath `"path\to\your\app.apk`"" -ForegroundColor Yellow
            exit 1
        }
        
        if ($apkFiles.Count -eq 1) {
            $ApkPath = $apkFiles[0].FullName
            Write-Host "Found APK: $ApkPath" -ForegroundColor Green
        } else {
            Write-Host "`nMultiple APK files found. Please select one:" -ForegroundColor Yellow
            for ($i = 0; $i -lt $apkFiles.Count; $i++) {
                Write-Host "$($i + 1). $($apkFiles[$i].FullName)" -ForegroundColor Cyan
            }
            $selection = Read-Host "Enter number (1-$($apkFiles.Count))"
            $ApkPath = $apkFiles[$selection - 1].FullName
        }
    }
    
    if (-not (Test-Path $ApkPath)) {
        Write-Host "APK file not found: $ApkPath" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "`nInstalling APK: $ApkPath" -ForegroundColor Cyan
    Write-Host "This may take a few moments..." -ForegroundColor Yellow
    
    & $adbPath install -r $ApkPath
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nAPK installed successfully!" -ForegroundColor Green
    } else {
        Write-Host "`nInstallation failed. Error code: $LASTEXITCODE" -ForegroundColor Red
        Write-Host "Try: adb install -r -d `"$ApkPath`"" -ForegroundColor Yellow
    }
} else {
    Write-Host "No device connected!" -ForegroundColor Red
    Write-Host "`nPlease ensure:" -ForegroundColor Yellow
    Write-Host "1. Your tablet is connected via Vysor" -ForegroundColor Yellow
    Write-Host "2. USB Debugging is enabled on your tablet" -ForegroundColor Yellow
    Write-Host "3. Vysor is running and the device is visible" -ForegroundColor Yellow
    Write-Host "`nRun 'adb devices' to check connection" -ForegroundColor Cyan
}




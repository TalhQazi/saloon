
Add-Type -AssemblyName System.Drawing
$sPath = "d:\saloon\mono_logo.png"
if (Test-Path $sPath) {
    $img = [System.Drawing.Image]::FromFile($sPath)
    Write-Host "Width: $($img.Width)"
    Write-Host "Height: $($img.Height)"
    $img.Dispose()
} else {
    Write-Host "File not found"
}

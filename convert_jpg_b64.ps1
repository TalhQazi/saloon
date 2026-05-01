
Add-Type -AssemblyName System.Drawing
$bmpPath = "d:\saloon\src\assets\images\img.bmp"
$outputPath = "d:\saloon\src\assets\images\temp_jpg_b64.txt"

if (Test-Path $bmpPath) {
    try {
        $img = [System.Drawing.Image]::FromFile($bmpPath)
        $ms = New-Object System.IO.MemoryStream
        $img.Save($ms, [System.Drawing.Imaging.ImageFormat]::Jpeg)
        $bytes = $ms.ToArray()
        $base64 = [Convert]::ToBase64String($bytes)
        $base64 | Out-File -FilePath $outputPath
        $img.Dispose()
        $ms.Dispose()
        Write-Host "Success"
    } catch {
        Write-Host "Error: $_"
    }
}

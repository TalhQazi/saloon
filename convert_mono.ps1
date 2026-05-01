
Add-Type -AssemblyName System.Drawing
$bmpPath = "d:\saloon\src\assets\images\img.bmp"
$outputPath = "d:\saloon\src\assets\images\logo_mono.bmp"
$assetPath = "d:\saloon\android\app\src\main\assets\images\logo_mono.bmp"

if (Test-Path $bmpPath) {
    try {
        $img = [System.Drawing.Bitmap]::FromFile($bmpPath)
        # Create a new 1bpp bitmap
        $monoBmp = $img.Clone([System.Drawing.Rectangle]::new(0, 0, $img.Width, $img.Height), [System.Drawing.Imaging.PixelFormat]::Format1bppIndexed)
        
        $monoBmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Bmp)
        
        if (!(Test-Path "d:\saloon\android\app\src\main\assets\images")) {
            New-Item -ItemType Directory -Force -Path "d:\saloon\android\app\src\main\assets\images"
        }
        Copy-Item $outputPath -Destination $assetPath -Force
        
        $img.Dispose()
        $monoBmp.Dispose()
        Write-Host "Success: Monochrome BMP created and copied"
    } catch {
        Write-Host "Error: $_"
    }
} else {
    Write-Host "File not found"
}

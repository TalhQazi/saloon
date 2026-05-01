
Add-Type -AssemblyName System.Drawing

$inputPath = "C:/Users/Ehsan Nawaz/.gemini/antigravity/brain/4cee9c90-8e12-4191-a371-23e01831066d/uploaded_media_1769363662560.jpg"
$outputPath = "d:\saloon\mono_logo_resized.png"
$base64Path = "d:\saloon\new_logo_mono_base64.txt"

# Printer width standard (e.g. 58mm printer is usually 384 dots)
$targetWidth = 384

if (Test-Path $inputPath) {
    try {
        $img = [System.Drawing.Image]::FromFile($inputPath)
        
        # Calculate new height to maintain aspect ratio
        $ratio = $img.Height / $img.Width
        $targetHeight = [int]($targetWidth * $ratio)
        
        Write-Host "Resizing to ${targetWidth}x${targetHeight}..."
        
        # Create new bitmap for resizing
        $resizedFn = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight)
        $graph = [System.Drawing.Graphics]::FromImage($resizedFn)
        
        # High quality resizing settings to keep text sharp
        $graph.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graph.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graph.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graph.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

        $graph.DrawImage($img, 0, 0, $targetWidth, $targetHeight)
        
        # Now convert to 1bpp (Monochrome)
        # Note: Direct clone to 1bpp often produces bad thresholds. 
        # For simplicity in Powershell without external libs, we stick to default 1bpp conversion 
        # but resizing first helps a lot.
        
        $monoBmp = $resizedFn.Clone([System.Drawing.Rectangle]::new(0, 0, $resizedFn.Width, $resizedFn.Height), [System.Drawing.Imaging.PixelFormat]::Format1bppIndexed)
        
        # Save
        $monoBmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
        
        # Cleanup
        $img.Dispose()
        $graph.Dispose()
        $resizedFn.Dispose()
        $monoBmp.Dispose()
        
        # Convert to Base64
        $bytes = [System.IO.File]::ReadAllBytes($outputPath)
        $base64 = [Convert]::ToBase64String($bytes)
        
        $base64 | Out-File $base64Path -Encoding ascii -NoNewline
        
        Write-Host "Success: Resized ${targetWidth}x${targetHeight} and converted."
    } catch {
        Write-Host "Error: $_"
        exit 1
    }
} else {
    Write-Host "File not found"
}


Add-Type -AssemblyName System.Drawing

$inputPath = "C:/Users/Ehsan Nawaz/.gemini/antigravity/brain/4cee9c90-8e12-4191-a371-23e01831066d/uploaded_media_1769363662560.jpg"
$outputPath = "d:\saloon\mono_logo_fixed.png"
$base64Path = "d:\saloon\new_logo_mono_base64.txt"
# Increasing width to 500 to effectively "zoom in" if there are white margins, 
# or max out the printer width. 58mm is usually 384 dots, so 500 is ~130%
$targetWidth = 500

if (Test-Path $inputPath) {
    $img = [System.Drawing.Image]::FromFile($inputPath)
    $ratio = $img.Height / $img.Width
    $targetHeight = [int]($targetWidth * $ratio)
    
    # 1. Resize high quality
    $bmp = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight)
    $graph = [System.Drawing.Graphics]::FromImage($bmp)
    $graph.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graph.DrawImage($img, 0, 0, $targetWidth, $targetHeight)
    $graph.Dispose()
    
    # 2. Thresholding
    for ($x = 0; $x -lt $bmp.Width; $x++) {
        for ($y = 0; $y -lt $bmp.Height; $y++) {
            $c = $bmp.GetPixel($x, $y)
            if ($c.GetBrightness() -lt 0.90) {
                $bmp.SetPixel($x, $y, [System.Drawing.Color]::Black)
            } else {
                $bmp.SetPixel($x, $y, [System.Drawing.Color]::White)
            }
        }
    }
    
    # 3. Save as PNG
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $img.Dispose()

    # Convert to Base64
    $bytes = [System.IO.File]::ReadAllBytes($outputPath)
    $base64 = [Convert]::ToBase64String($bytes)
    $base64 | Out-File $base64Path -Encoding ascii -NoNewline
    
    Write-Host "Success: Thresholded resized image created. Size: $($targetWidth)x$($targetHeight)"
}

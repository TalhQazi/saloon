
Add-Type -AssemblyName System.Drawing

$inputPath = "C:/Users/Ehsan Nawaz/.gemini/antigravity/brain/3ddf4a0c-3cfd-4701-a8ca-d96bb9c3ef76/uploaded_media_1769453901449.jpg"
$outputPath = "d:\saloon\mono_logo_fixed.png"
$base64Path = "d:\saloon\new_logo_mono_base64.txt"
$targetWidth = 320

if (Test-Path $inputPath) {
    $img = [System.Drawing.Image]::FromFile($inputPath)
    $ratio = $img.Height / $img.Width
    $targetHeight = [int]($targetWidth * $ratio)
    
    # 1. Resize high quality
    $bmp = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight)
    $graph = [System.Drawing.Graphics]::FromImage($bmp)
    $graph.Clear([System.Drawing.Color]::White)
    $graph.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graph.DrawImage($img, 0, 0, $targetWidth, $targetHeight)
    
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
    
    $graph.Dispose()
    $img.Dispose()
    
    # 3. Save
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()

    # Convert to Base64
    $bytes = [System.IO.File]::ReadAllBytes($outputPath)
    $base64 = [Convert]::ToBase64String($bytes)
    $base64 | Out-File $base64Path -Encoding ascii -NoNewline
    
    Write-Host "Success: Processed logo without border. Size: $($targetWidth)x$($targetHeight)"
} else {
    Write-Host "Input file not found"
}

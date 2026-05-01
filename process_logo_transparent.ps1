
Add-Type -AssemblyName System.Drawing

$inputPath = "C:/Users/Ehsan Nawaz/.gemini/antigravity/brain/4cee9c90-8e12-4191-a371-23e01831066d/uploaded_media_1769367350216.png"
$outputPath = "d:\saloon\mono_logo_transparent_fixed.png"
$base64Path = "d:\saloon\new_logo_mono_base64.txt"
$targetWidth = 500

if (Test-Path $inputPath) {
    try {
        $img = [System.Drawing.Image]::FromFile($inputPath)
        $ratio = $img.Height / $img.Width
        $targetHeight = [int]($targetWidth * $ratio)
        
        # 1. Resize high quality
        $bmp = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight)
        $graph = [System.Drawing.Graphics]::FromImage($bmp)
        $graph.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graph.DrawImage($img, 0, 0, $targetWidth, $targetHeight)
        $graph.Dispose()
        
        # 2. Thresholding with Transparency support
        for ($x = 0; $x -lt $bmp.Width; $x++) {
            for ($y = 0; $y -lt $bmp.Height; $y++) {
                $c = $bmp.GetPixel($x, $y)
                
                # Check for transparency (Alpha)
                # If transparent (A < 50), make it White (Paper)
                if ($c.A -lt 50) {
                    $bmp.SetPixel($x, $y, [System.Drawing.Color]::White)
                } 
                # Else check brightness for the Gold text
                # Gold is dark enough to be Black compared to White
                elseif ($c.GetBrightness() -lt 0.90) {
                    $bmp.SetPixel($x, $y, [System.Drawing.Color]::Black)
                } 
                else {
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
        
        Write-Host "Success: Processed transparent logo. Size: $($targetWidth)x$($targetHeight)"
    } catch {
        Write-Host "Error: $_"
        exit 1
    }
} else {
    Write-Host "Input file not found."
    exit 1
}

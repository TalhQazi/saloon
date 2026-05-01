
Add-Type -AssemblyName System.Drawing

$inputPath = "C:/Users/Ehsan Nawaz/.gemini/antigravity/brain/4cee9c90-8e12-4191-a371-23e01831066d/uploaded_media_1769363662560.jpg"
$outputPath = "d:\saloon\mono_logo.png"
$base64Path = "d:\saloon\new_logo_mono_base64.txt"

if (Test-Path $inputPath) {
    try {
        $img = [System.Drawing.Bitmap]::FromFile($inputPath)
        
        # Create a new bitmap with the same dimensions but 1bpp
        $monoBmp = $img.Clone([System.Drawing.Rectangle]::new(0, 0, $img.Width, $img.Height), [System.Drawing.Imaging.PixelFormat]::Format1bppIndexed)
        
        # Save as PNG
        $monoBmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
        
        $img.Dispose()
        $monoBmp.Dispose()
        
        # Convert to Base64
        $bytes = [System.IO.File]::ReadAllBytes($outputPath)
        $base64 = [Convert]::ToBase64String($bytes)
        
        # Write to file
        $base64 | Out-File $base64Path -Encoding ascii -NoNewline
        
        Write-Host "Success: Processed logo to monochrome PNG and converted to base64."
    } catch {
        Write-Host "Error processing image: $_"
        exit 1
    }
} else {
    Write-Host "Input file not found: $inputPath"
    exit 1
}

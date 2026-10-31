Add-Type -AssemblyName System.Drawing
$srcPath = "public\mingle-booth-logo.png"
if (-not (Test-Path $srcPath)) {
    Write-Error "Source logo not found at $srcPath"
    exit 1
}

$src = [System.Drawing.Image]::FromFile((Resolve-Path $srcPath).Path)

function Resize-Image($img, [int]$width, [int]$height, [string]$outPath) {
    $bm = New-Object System.Drawing.Bitmap($width, $height)
    $g = [System.Drawing.Graphics]::FromImage($bm)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    
    $srcW = $img.Width
    $srcH = $img.Height
    $ratio = [Math]::Min($width / $srcW, $height / $srcH)
    $destW = [int]($srcW * $ratio)
    $destH = [int]($srcH * $ratio)
    $destX = [int](($width - $destW) / 2)
    $destY = [int](($height - $destH) / 2)

    $g.DrawImage($img, $destX, $destY, $destW, $destH)
    $bm.Save((Resolve-Path $outPath).Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bm.Dispose()
    Write-Host "Generated $outPath"
}

Resize-Image $src 192 192 "public\icons\icon-192.png"
Resize-Image $src 512 512 "public\icons\icon-512.png"
Resize-Image $src 512 512 "public\icons\icon-maskable-512.png"
Resize-Image $src 180 180 "public\icons\apple-touch-icon.png"
$src.Dispose()
Write-Host "All icons generated successfully!"

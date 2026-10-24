Add-Type -AssemblyName System.Drawing

function Generate-Icon([int]$size, [string]$outputPath, [bool]$isMaskable) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size

    # Background gradient
    $colorTop = [System.Drawing.Color]::FromArgb(255, 30, 15, 55)
    $colorBottom = [System.Drawing.Color]::FromArgb(255, 10, 10, 15)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, $colorTop, $colorBottom, 45.0

    if ($isMaskable) {
        # Full bleed square for maskable
        $g.FillRectangle($brush, $rect)
    } else {
        # Rounded rect or full background with circular aura
        $g.FillRectangle($brush, $rect)
    }

    # Outer neon ring
    $center = $size / 2.0
    $radius = $size * 0.40
    $ringRect = New-Object System.Drawing.RectangleF ($center - $radius), ($center - $radius), ($radius * 2), ($radius * 2)

    $glowColor = [System.Drawing.Color]::FromArgb(120, 168, 85, 247)
    $glowPen = New-Object System.Drawing.Pen $glowColor, ($size * 0.03)
    $g.DrawEllipse($glowPen, $ringRect)

    # Glowing inner circle
    $innerRadius = $size * 0.36
    $innerRect = New-Object System.Drawing.RectangleF ($center - $innerRadius), ($center - $innerRadius), ($innerRadius * 2), ($innerRadius * 2)
    $innerBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 20, 15, 35))
    $g.FillEllipse($innerBrush, $innerRect)

    # Camera body
    $camW = $size * 0.44
    $camH = $size * 0.30
    $camX = ($size - $camW) / 2.0
    $camY = ($size - $camH) / 2.0 + ($size * 0.02)
    $camRect = New-Object System.Drawing.RectangleF $camX, $camY, $camW, $camH

    $camBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $camRect, ([System.Drawing.Color]::FromArgb(255, 192, 132, 252)), ([System.Drawing.Color]::FromArgb(255, 147, 51, 234)), 90.0
    $g.FillRectangle($camBrush, $camRect)

    # Top camera bump / flash mount
    $bumpW = $camW * 0.35
    $bumpH = $size * 0.05
    $bumpX = $camX + ($camW - $bumpW) / 2.0
    $bumpY = $camY - $bumpH + 1
    $bumpBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 216, 180, 254))
    $g.FillRectangle($bumpBrush, (New-Object System.Drawing.RectangleF $bumpX, $bumpY, $bumpW, $bumpH))

    # Lens outer ring
    $lensR = $camH * 0.38
    $lensX = $center - $lensR
    $lensY = ($camY + ($camH / 2.0)) - $lensR
    $lensRect = New-Object System.Drawing.RectangleF $lensX, $lensY, ($lensR * 2), ($lensR * 2)
    $lensOuterBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 15, 10, 25))
    $g.FillEllipse($lensOuterBrush, $lensRect)

    # Lens glass (cyan / purple reflection)
    $glassR = $lensR * 0.72
    $glassRect = New-Object System.Drawing.RectangleF ($center - $glassR), (($camY + ($camH / 2.0)) - $glassR), ($glassR * 2), ($glassR * 2)
    $glassBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $glassRect, ([System.Drawing.Color]::FromArgb(255, 56, 189, 248)), ([System.Drawing.Color]::FromArgb(255, 168, 85, 247)), 45.0
    $g.FillEllipse($glassBrush, $glassRect)

    # Flash sparkle dot
    $dotR = $size * 0.022
    $dotRect = New-Object System.Drawing.RectangleF ($camX + $camW * 0.8), ($camY + $camH * 0.25), ($dotR * 2), ($dotR * 2)
    $dotBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 253, 224, 71))
    $g.FillEllipse($dotBrush, $dotRect)

    $g.Flush()
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Generated: $outputPath ($size x $size)"
}

Generate-Icon 192 "public/icons/icon-192.png" $false
Generate-Icon 512 "public/icons/icon-512.png" $false
Generate-Icon 512 "public/icons/icon-maskable-512.png" $true
Generate-Icon 180 "public/icons/apple-touch-icon.png" $false

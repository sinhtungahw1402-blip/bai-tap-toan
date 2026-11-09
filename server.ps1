# =============================================================================
# AZOTA TOÁN - MÁY CHỦ WEB TỰ ĐỘNG CHỌN CỔNG & KHỞI CHẠY 1 CÚ NHẤP CHUỘT
# =============================================================================

$folder = $PSScriptRoot

# Tìm địa chỉ IP Wi-Fi
$localIP = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { 
    $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254*" 
} | Select-Object -ExpandProperty IPAddress | Select-Object -First 1)

if (-not $localIP) { $localIP = "localhost" }

# Tự động tìm cổng khả dụng (8080, 8081, 8082, 3000, 5000, ...)
$portsToTry = @(8080, 8081, 8082, 3000, 5000, 8888, 9090)
$listener = $null
$activePort = 8080

foreach ($p in $portsToTry) {
    try {
        $tempListener = New-Object System.Net.HttpListener
        # Thử bind IP nội bộ và localhost
        $tempListener.Prefixes.Add("http://localhost:$p/")
        if ($localIP -ne "localhost") {
            try { $tempListener.Prefixes.Add("http://${localIP}:$p/") } catch {}
        }
        $tempListener.Start()
        $listener = $tempListener
        $activePort = $p
        break
    } catch {
        # Cổng đang bận, thử cổng tiếp theo
        if ($tempListener) { $tempListener.Close() }
    }
}

if (-not $listener) {
    Write-Host "Không thể mở cổng mạng. Bạn có thể mở trực tiếp file 'index.html' bằng trình duyệt!" -ForegroundColor Red
    Start-Process (Join-Path $folder "index.html")
    exit
}

Clear-Host
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "   🎓 AZOTA TOÁN - MÁY CHỦ WEB ĐANG HOẠT ĐỘNG! 🎓" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host " [1] Trên Máy Tính:" -ForegroundColor Yellow
Write-Host "     👉 http://localhost:$activePort" -ForegroundColor White
Write-Host ""
Write-Host " [2] Trên Điện Thoại (Cùng mạng Wi-Fi với máy tính này):" -ForegroundColor Yellow
Write-Host "     👉 http://${localIP}:$activePort" -ForegroundColor Green
Write-Host ""
Write-Host " [3] Hướng dẫn sử dụng nhanh:" -ForegroundColor Magenta
Write-Host "     - Bấm nút 'VÀO LÀM BÀI THI THỬ NGAY' để thi thử ngay lập tức" -ForegroundColor White
Write-Host "     - Hoặc bấm chọn nhanh 1 trong 3 bạn học sinh mẫu (Pass: 123456)" -ForegroundColor White
Write-Host "     - Quản trị viên: Bấm nút 'Cổng Quản trị viên' để đăng ký thiết bị" -ForegroundColor White
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " Nhấn Ctrl + C để dừng máy chủ." -ForegroundColor DarkYellow
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

# Mở trình duyệt web tự động
Start-Process "http://localhost:$activePort"

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".ico"  = "image/x-icon"
    ".xlsx" = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $urlPath = $request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($urlPath)) { $urlPath = "index.html" }
        $filePath = Join-Path $folder $urlPath

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = $mimeTypes[$ext]
            if (-not $mime) { $mime = "application/octet-stream" }

            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentType = $mime
            $response.ContentLength64 = $bytes.Length
            $response.AddHeader("Access-Control-Allow-Origin", "*")
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.OutputStream.Write($msg, 0, $msg.Length)
        }
        $response.Close()
    } catch {
        break
    }
}

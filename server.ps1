# =============================================================================
# AZOTA TOÁN - MÁY CHỦ THI TRỰC TUYẾN CỤC BỘ (POWERSHELL WEB SERVER)
# =============================================================================
# Chạy trực tiếp trên Windows mà không cần cài Node.js, Python hay bất cứ phần mềm nào.
# Tự động phát hiện IP Wi-Fi để học sinh dùng điện thoại cùng mạng có thể vào thi!
# =============================================================================

param([int]$port = 8080)

$folder = $PSScriptRoot

# Lấy địa chỉ IP nội bộ Wi-Fi/LAN của máy tính này
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
    $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254*" 
} | Select-Object -ExpandProperty IPAddress | Select-Object -First 1)

if (-not $localIP) { $localIP = "localhost" }

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://*:$port/")

try {
    $listener.Start()
} catch {
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$port/")
    $listener.Start()
}

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "   🎓 AZOTA TOÁN - NỀN TẢNG THI TRỰC TUYẾN CHUẨN GDPT 2018 🎓" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " [1] Trên Máy Tính (Thầy/Cô & Học sinh thử nghiệm):" -ForegroundColor Yellow
Write-Host "     👉 http://localhost:$port" -ForegroundColor White
Write-Host ""
Write-Host " [2] Trên Điện Thoại (Cùng mạng Wi-Fi với máy tính này):" -ForegroundColor Yellow
Write-Host "     👉 http://${localIP}:$port" -ForegroundColor Green
Write-Host "     (Mở Safari/Chrome trên điện thoại và gõ địa chỉ trên để cài PWA)" -ForegroundColor DarkGray
Write-Host ""
Write-Host " [3] Tài khoản thử nghiệm có sẵn:" -ForegroundColor Magenta
Write-Host "     - Học sinh thi ngay: tranminh | Mật khẩu: 123456" -ForegroundColor White
Write-Host "     - Quản trị viên: Nhấn 'Quản trị viên' để đăng ký thiết bị lần đầu" -ForegroundColor White
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " Nhấn Ctrl + C để dừng máy chủ." -ForegroundColor DarkYellow
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

# Tự động mở trình duyệt web
Start-Process "http://localhost:$port"

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
        # Đóng server khi người dùng nhấn Ctrl+C
        break
    }
}

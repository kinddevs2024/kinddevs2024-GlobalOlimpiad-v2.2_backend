# Test Network Access Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Server Network Access" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get local IP addresses
$ipAddresses = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notlike "127.*" -and 
    $_.IPAddress -notlike "169.254.*" -and
    $_.IPAddress -notlike "172.22.*"
} | Select-Object -ExpandProperty IPAddress

Write-Host "Your Network IP Addresses:" -ForegroundColor Yellow
foreach ($ip in $ipAddresses) {
    Write-Host "  - $ip" -ForegroundColor Green
}
Write-Host ""

# Test localhost
Write-Host "Testing localhost:3000..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    Write-Host "✅ Localhost is working! Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Localhost is not responding: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test network IPs
foreach ($ip in $ipAddresses) {
    Write-Host "Testing $ip:3000..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "http://${ip}:3000/api/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        Write-Host "✅ $ip is accessible! Status: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "   Use this URL from other devices: http://${ip}:3000" -ForegroundColor Cyan
    } catch {
        Write-Host "❌ $ip is not accessible: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "   This might be a firewall issue." -ForegroundColor Yellow
    }
    Write-Host ""
}

# Check firewall
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Firewall Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
$firewallRule = Get-NetFirewallRule -DisplayName "*3000*" -ErrorAction SilentlyContinue
if ($firewallRule) {
    Write-Host "✅ Firewall rule found for port 3000" -ForegroundColor Green
} else {
    Write-Host "⚠️  No firewall rule found for port 3000" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To allow network access, run this as Administrator:" -ForegroundColor Yellow
    Write-Host '  netsh advfirewall firewall add rule name="Node.js Server Port 3000" dir=in action=allow protocol=TCP localport=3000' -ForegroundColor Cyan
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan


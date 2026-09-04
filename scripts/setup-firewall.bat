@echo off
:: Batch script to allow Purrsonica Companion port 51820 in Windows Firewall
setlocal

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting Administrator privileges to configure Windows Firewall...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo Configuring Windows Defender Firewall for Purrsonica Mobile Companion...
netsh advfirewall firewall delete rule name="Purrsonica Mobile Companion" >nul 2>&1
netsh advfirewall firewall add rule name="Purrsonica Mobile Companion" dir=in action=allow protocol=TCP localport=51820 profile=any

echo.
echo ====================================================================
echo SUCCESS: Port 51820 is now open in Windows Firewall!
echo Purrsonica Mobile can now communicate with this PC over your Wi-Fi.
echo ====================================================================
echo.
timeout /t 5

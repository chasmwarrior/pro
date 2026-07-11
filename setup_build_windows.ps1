<#
.SYNOPSIS
Mengunduh dan mengatur environment Java (OpenJDK) dan Android SDK untuk Capacitor secara otomatis di Windows,
tanpa memerlukan Hak Akses Administrator.
#>

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Setup Android SDK & Java untuk Build APK Windows " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

$workspace = $PSScriptRoot
$toolsDir = Join-Path $workspace ".android-tools"

if (-not (Test-Path $toolsDir)) {
    New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
}

# 1. Download & Extract OpenJDK 21
$javaDir = Join-Path $toolsDir "jdk-21"
if (-not (Test-Path $javaDir)) {
    Write-Host "1. Mengunduh OpenJDK 21..." -ForegroundColor Yellow
    $javaUrl = "https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.3%2B9/OpenJDK21U-jdk_x64_windows_hotspot_21.0.3_9.zip"
    $javaZip = Join-Path $toolsDir "jdk.zip"
    Invoke-WebRequest -Uri $javaUrl -OutFile $javaZip

    Write-Host "   Mengekstrak Java..." -ForegroundColor Yellow
    Expand-Archive -Path $javaZip -DestinationPath $toolsDir -Force

    # Rename folder yang diekstrak (biasanya jdk-21.0.3+9) ke direktori standar
    $extractedFolder = Get-ChildItem -Path $toolsDir -Directory -Filter "jdk-21*" | Select-Object -First 1
    Rename-Item -Path $extractedFolder.FullName -NewName "jdk-21"
    Remove-Item $javaZip
} else {
    Write-Host "1. OpenJDK 21 sudah siap." -ForegroundColor Green
}

# 2. Download & Extract Android Command Line Tools
$androidHome = Join-Path $toolsDir "android-sdk"
$cmdlineToolsDir = Join-Path $androidHome "cmdline-tools\latest"
if (-not (Test-Path $cmdlineToolsDir)) {
    Write-Host "2. Mengunduh Android Command Line Tools..." -ForegroundColor Yellow
    $sdkUrl = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
    $sdkZip = Join-Path $toolsDir "sdk.zip"
    Invoke-WebRequest -Uri $sdkUrl -OutFile $sdkZip

    Write-Host "   Mengekstrak Android SDK..." -ForegroundColor Yellow
    Expand-Archive -Path $sdkZip -DestinationPath $toolsDir -Force

    # Restrukturisasi path menjadi android-sdk/cmdline-tools/latest
    New-Item -ItemType Directory -Force -Path (Join-Path $androidHome "cmdline-tools") | Out-Null
    Move-Item -Path (Join-Path $toolsDir "cmdline-tools") -Destination $cmdlineToolsDir -Force
    Remove-Item $sdkZip
} else {
    Write-Host "2. Android Command Line Tools sudah siap." -ForegroundColor Green
}

# 3. Mengatur Environment Variables untuk Sesi saat ini (Process Level)
Write-Host "3. Mengonfigurasi Environment Variables..." -ForegroundColor Yellow
$env:JAVA_HOME = $javaDir
$env:ANDROID_HOME = $androidHome

$javaBin = Join-Path $javaDir "bin"
$sdkBin = Join-Path $cmdlineToolsDir "bin"
$sdkPlatformTools = Join-Path $androidHome "platform-tools"

# Tambahkan ke Process PATH jika belum ada
if ($env:PATH -notmatch [regex]::Escape($javaBin)) {
    $env:PATH = "$javaBin;$sdkBin;$sdkPlatformTools;" + $env:PATH
}

Write-Host "   JAVA_HOME: $env:JAVA_HOME" -ForegroundColor DarkGray
Write-Host "   ANDROID_HOME: $env:ANDROID_HOME" -ForegroundColor DarkGray

# 4. Menerima Lisensi dan Menginstal Android Platforms & Build Tools
Write-Host "4. Menerima Lisensi SDK dan Menginstal Platform..." -ForegroundColor Yellow
# yes equivalent in powershell to accept licenses
$yes = "y`n" * 10
$yes | sdkmanager.bat --licenses *>$null
sdkmanager.bat "platform-tools" "platforms;android-35" "build-tools;35.0.0" *>$null

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host " Setup Berhasil! Memulai proses Build APK... " -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# 5. Panggil script build utama
$buildScript = Join-Path $workspace "build_apk_windows.bat"
& cmd.exe /c $buildScript

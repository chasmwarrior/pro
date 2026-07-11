@echo off
echo ===================================================
echo   Absensi App - Build APK Windows (VS Code)
echo ===================================================
echo.

echo 0. Memeriksa JAVA_HOME...
if "%JAVA_HOME%"=="" (
    echo [INFO] JAVA_HOME tidak ditemukan.
    echo Menjalankan skrip PowerShell untuk mengunduh dan mengatur Java ^& Android SDK secara otomatis...
    echo.
    powershell.exe -ExecutionPolicy Bypass -File "%~dp0setup_build_windows.ps1"
    exit /b
)

echo 1. Memeriksa Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js tidak ditemukan! Silakan instal dari https://nodejs.org/
    pause
    exit /b
)
echo Node.js terinstal.

echo.
echo 2. Menginstal Dependensi NPM (Jika belum)...
call npm install
echo Memastikan Capacitor terinstal...
call npm install @capacitor/core
call npm install -D @capacitor/cli @capacitor/android

echo.
echo 3. Build Web App (Vite)...
echo Mengatur Base URL API ke https://warriorcarl.my.id ...
echo VITE_API_BASE_URL=https://warriorcarl.my.id> .env.production
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Gagal melakukan build aplikasi web.
    pause
    exit /b
)

echo.
echo 4. Inisialisasi dan Sinkronisasi Capacitor...
if not exist "capacitor.config.json" (
    if not exist "capacitor.config.ts" (
        call npx cap init Absensi "com.absensi.app" --web-dir dist
    )
)

if not exist "android\" (
    echo Folder "android" tidak ditemukan, menambahkan platform Android...
    call npx cap add android
)

call npx cap sync android

echo.
echo 5. Build APK dengan Gradle...
if not exist "android\" (
    echo [ERROR] Folder "android" gagal dibuat.
    pause
    exit /b
)
cd android
echo Mengunduh dependensi dan membuat APK (Mungkin membutuhkan waktu beberapa menit)...

echo Memperbaiki konflik Kotlin Stdlib Duplicate Classes...
powershell -Command "(Get-Content android\app\build.gradle) -replace 'dependencies \{', 'configurations { all { exclude group: ''org.jetbrains.kotlin'', module: ''kotlin-stdlib-jdk7'' ; exclude group: ''org.jetbrains.kotlin'', module: ''kotlin-stdlib-jdk8'' } } dependencies {' | Set-Content android\app\build.gradle"

call gradlew.bat assembleDebug
if %errorlevel% neq 0 (
    echo [ERROR] Gagal membuat APK. Pastikan Android Studio / SDK terinstal dan path Java/Android sudah benar.
    cd ..
    pause
    exit /b
)
cd ..

echo.
echo ===================================================
echo BUILD BERHASIL!
echo Lokasi APK: %CD%\android\app\build\outputs\apk\debug\app-debug.apk
echo ===================================================
pause

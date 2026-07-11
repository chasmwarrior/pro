#!/bin/bash

# Exit on error
set -e

echo "==================================================="
echo "  Absensi App - Ubuntu 22.04 All-in-One Installer  "
echo "==================================================="

# Simpan direktori proyek saat script ini dijalankan
APP_DIR=$(pwd)

DOMAIN="warriorcarl.my.id"
EMAIL="warriorcarl@yahoo.com"
PORT=3000

echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo "Port: $PORT"

echo "1. Mengupdate sistem dan menginstal dependensi dasar..."
sudo apt-get update -y
sudo apt-get install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates build-essential

echo "2. Menginstal Node.js (LTS)..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "Node.js sudah terinstal: $(node -v)"
fi

echo "3. Menginstal Nginx, PM2, dan Certbot..."
sudo apt-get install -y nginx certbot python3-certbot-nginx
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

echo "4. Menginstal OpenJDK 21 (Syarat Capacitor/Android API 35)..."
sudo apt-get install -y openjdk-21-jdk

echo "5. Menginstal Android SDK (Command Line Tools)..."
ANDROID_HOME="/opt/android-sdk"
if [ ! -d "$ANDROID_HOME" ]; then
    sudo mkdir -p $ANDROID_HOME/cmdline-tools
    cd /tmp
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O cmdline.zip
    sudo unzip -q cmdline.zip -d $ANDROID_HOME/cmdline-tools
    sudo mv $ANDROID_HOME/cmdline-tools/cmdline-tools $ANDROID_HOME/cmdline-tools/latest

    # Set permissions
    sudo chown -R $USER:$USER $ANDROID_HOME
fi

export ANDROID_HOME=$ANDROID_HOME
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

echo "Menerima lisensi Android SDK..."
yes | sdkmanager --licenses > /dev/null || true

echo "Menginstal platform & build-tools..."
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0" > /dev/null || true

echo "6. Setup Proyek & Capacitor..."
# Kembali ke direktori proyek utama
cd $APP_DIR

npm install

# Instal dependensi Capacitor jika belum ada
if ! grep -q "@capacitor/core" package.json; then
    npm install @capacitor/core
    npm install -D @capacitor/cli @capacitor/android
fi

# Inisialisasi Capacitor jika belum
if [ ! -f "capacitor.config.json" ] && [ ! -f "capacitor.config.ts" ]; then
    npx cap init Absensi "com.absensi.app" --web-dir dist
fi

echo "7. Build Aplikasi Web..."
# Menyimpan env production
echo "VITE_API_BASE_URL=https://$DOMAIN" > .env.production
npm run build

echo "8. Menjalankan Backend dengan PM2..."
pm2 stop absensi || true
pm2 start dist/server.cjs --name "absensi"
pm2 save
# Optionally setup startup script
# pm2 startup | grep "sudo pm2" | bash || true

echo "9. Mengatur Capacitor dan Build APK..."
npx cap add android || true
npx cap sync android

echo "Membangun APK (Debug)..."
cd android
./gradlew assembleDebug
cd ..

echo "10. Setup Nginx & SSL Certbot..."
NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"

sudo tee $NGINX_CONF > /dev/null <<NGINXEOF
server {
    server_name $DOMAIN;

    # Meningkatkan limit upload jika foto absen ukurannya besar
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINXEOF

sudo ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t || true
sudo systemctl restart nginx || true

echo "Meminta sertifikat SSL dari Let's Encrypt..."
# Non-interactive, agree to TOS
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $EMAIL --redirect || echo "Certbot gagal. Pastikan domain sudah diarahkan ke IP server Anda dan port 80/443 terbuka."

echo "==================================================="
echo " Instalasi Selesai!"
echo " Web App URL: https://$DOMAIN"
echo " Lokasi APK : $APP_DIR/android/app/build/outputs/apk/debug/app-debug.apk"
echo "==================================================="

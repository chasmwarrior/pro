#!/bin/bash

# Exit on error
set -e

echo "==================================================="
echo "  Absensi App - Ubuntu 22.04 Web Installer Server  "
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

echo "4. Setup Proyek..."
# Kembali ke direktori proyek utama
cd $APP_DIR

npm install

# Instal dependensi Capacitor (Diperlukan jika nanti mau di build di lokal laptop/PC)
if ! grep -q "@capacitor/core" package.json; then
    npm install @capacitor/core
    npm install -D @capacitor/cli @capacitor/android
fi
if [ ! -f "capacitor.config.json" ] && [ ! -f "capacitor.config.ts" ]; then
    npx cap init Absensi "com.absensi.app" --web-dir dist
fi

echo "5. Build Aplikasi Web..."
# Menyimpan env production
echo "VITE_API_BASE_URL=https://$DOMAIN" > .env.production
npm run build

echo "6. Menjalankan Backend dengan PM2..."
pm2 stop absensi || true
pm2 start dist/server.cjs --name "absensi"
pm2 save
# pm2 startup | grep "sudo pm2" | bash || true

echo "7. Setup Nginx & SSL Certbot..."
NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"

sudo tee $NGINX_CONF > /dev/null <<NGINXEOF
server {
    server_name $DOMAIN;

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

echo "8. Meminta sertifikat SSL dari Let's Encrypt..."
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $EMAIL --redirect || echo "Certbot gagal. Pastikan domain sudah diarahkan ke IP server Anda dan port 80/443 terbuka."

echo "==================================================="
echo " Instalasi Server Selesai!"
echo " Silakan akses aplikasi melalui: https://$DOMAIN"
echo " (Proses build APK dihapus agar server tidak berat. Anda bisa mem-build APK dari laptop Anda)"
echo "==================================================="

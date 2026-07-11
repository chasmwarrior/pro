#!/bin/bash

echo "==================================================="
echo "       Absensi App - Monitoring Status Server       "
echo "==================================================="
echo ""

echo ">>> STATUS BACKEND (PM2) <<<"
pm2 status absensi || echo "Backend PM2 (absensi) tidak ditemukan atau belum berjalan."
echo ""

echo ">>> LOG ERROR BACKEND TERBARU (5 Baris) <<<"
pm2 logs absensi --lines 5 --err --nostream || echo "Tidak bisa memuat log PM2."
echo ""

echo ">>> STATUS FRONTEND / WEB SERVER (NGINX) <<<"
systemctl is-active --quiet nginx && echo "Nginx is RUNNING (OK)" || echo "Nginx is STOPPED / ERROR"
echo ""

echo ">>> LOG ERROR NGINX TERBARU (5 Baris) <<<"
sudo tail -n 5 /var/log/nginx/error.log 2>/dev/null || echo "Log Nginx kosong atau tidak dapat diakses."
echo ""

echo "==================================================="
echo "  Gunakan 'pm2 logs absensi' untuk log backend penuh  "
echo "==================================================="

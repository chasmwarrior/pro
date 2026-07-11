#!/bin/bash

# Pastikan script ini dijalankan di dalam folder proyek
APP_DIR=$(pwd)

echo "==================================================="
echo "     Absensi App - Manajemen Server & Data        "
echo "==================================================="
echo "Pilih aksi yang ingin dilakukan:"
echo "  1) Mulai (Start) Server"
echo "  2) Hentikan (Stop) Server"
echo "  3) Restart Server"
echo "  4) Hapus SELURUH Data & Reset Server (DANGER!)"
echo "  0) Keluar"
echo "==================================================="
read -p "Masukkan pilihan (0-4): " choice

case $choice in
    1)
        echo "Memulai server..."
        pm2 start absensi || echo "Proses PM2 absensi belum ada. Jalankan ./install.sh terlebih dahulu."
        sudo systemctl start nginx
        echo "Server berhasil dimulai."
        ;;
    2)
        echo "Menghentikan server..."
        pm2 stop absensi || echo "Proses PM2 absensi tidak ditemukan."
        sudo systemctl stop nginx
        echo "Server berhasil dihentikan."
        ;;
    3)
        echo "Merestart server..."
        pm2 restart absensi || echo "Proses PM2 absensi tidak ditemukan."
        sudo systemctl restart nginx
        echo "Server berhasil direstart."
        ;;
    4)
        echo "PERINGATAN: Ini akan MENGHAPUS SEMUA DATA absensi (Database) dan Menghentikan Server!"
        read -p "Apakah Anda YAKIN? Ketik 'HAPUS' untuk melanjutkan: " confirm
        if [ "$confirm" == "HAPUS" ]; then
            echo "Menghapus proses dari PM2..."
            pm2 delete absensi || true
            pm2 save

            echo "Menghapus Database JSON..."
            rm -rf $APP_DIR/src/db/db.json

            echo "Menghapus folder build / dist..."
            rm -rf $APP_DIR/dist

            echo "Semua data server telah di-reset. Anda perlu menjalankan ./install.sh lagi untuk setup ulang."
        else
            echo "Aksi dibatalkan."
        fi
        ;;
    0)
        echo "Keluar."
        exit 0
        ;;
    *)
        echo "Pilihan tidak valid!"
        exit 1
        ;;
esac

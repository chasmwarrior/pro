const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const targetLogic = `                  if (currentGeofenceStatus === 'outside') {
                    startCamera();
                  } else {
                    if (mapModalAction === 'checkin') handleCheckIn(null);
                    if (mapModalAction === 'checkout') handleCheckOut(null);
                  }`;
const replaceLogic = `                  if (currentGeofenceStatus !== 'inside') {
                    startCamera();
                  } else {
                    if (mapModalAction === 'checkin') handleCheckIn(null);
                    if (mapModalAction === 'checkout') handleCheckOut(null);
                  }`;
code = code.replace(targetLogic, replaceLogic);

const targetBtnLabel = `<span>{currentGeofenceStatus === 'outside' ? 'Lanjut Verifikasi Wajah (Luar Area)' : (mapModalAction === 'checkin' ? 'Konfirmasi Check-In' : 'Konfirmasi Check-Out')}</span>`;
const replaceBtnLabel = `<span>{currentGeofenceStatus !== 'inside' ? 'Lanjut Verifikasi Wajah (Luar Area)' : (mapModalAction === 'checkin' ? 'Konfirmasi Check-In' : 'Konfirmasi Check-Out')}</span>`;
code = code.replace(targetBtnLabel, replaceBtnLabel);

fs.writeFileSync('src/App.tsx', code);
console.log("Fixed modal logic");

const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const targetIn = `id="btn-check-in"
                          disabled={isLocating || deviceLat === null}`;
const replaceIn = `id="btn-check-in"
                          disabled={isLocating}`;
code = code.replace(targetIn, replaceIn);

const targetOut = `id="btn-check-out"
                          disabled={isLocating}`;
const replaceOut = `id="btn-check-out"
                          disabled={isLocating}`;
code = code.replace(targetOut, replaceOut);

const targetClick = `onClick={() => { setMapModalAction('checkin'); setShowCheckInMapModal(true); }}`;
const replaceClick = `onClick={() => {
                            if (deviceLat === null) {
                              alert("GPS Anda belum terdeteksi atau izin belum diberikan.");
                              return;
                            }
                            setMapModalAction('checkin'); 
                            setShowCheckInMapModal(true); 
                          }}`;
code = code.replace(targetClick, replaceClick);

const targetClickOut = `onClick={() => { setMapModalAction('checkout'); setShowCheckInMapModal(true); }}`;
const replaceClickOut = `onClick={() => {
                            if (deviceLat === null) {
                              alert("GPS Anda belum terdeteksi atau izin belum diberikan.");
                              return;
                            }
                            setMapModalAction('checkout'); 
                            setShowCheckInMapModal(true); 
                          }}`;
code = code.replace(targetClickOut, replaceClickOut);

fs.writeFileSync('src/App.tsx', code);
console.log('Fixed disabled state for checkin buttons');

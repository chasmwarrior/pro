const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Modify handleCheckIn and handleCheckOut to accept an optional photo parameter
code = code.replace(
  `const handleCheckIn = async () => {`,
  `const handleCheckIn = async (photoOverride?: string | null) => {
    const finalPhoto = photoOverride !== undefined ? photoOverride : livenessPhoto;`
);
code = code.replace(
  `livenessPhoto: livenessPhoto,`,
  `livenessPhoto: finalPhoto,`
);

code = code.replace(
  `const handleCheckOut = async () => {`,
  `const handleCheckOut = async (photoOverride?: string | null) => {
    const finalPhoto = photoOverride !== undefined ? photoOverride : livenessPhoto;`
);
code = code.replace(
  `body: JSON.stringify({
          userId: currentUser.id,
          lat: deviceLat,
          lng: deviceLng,
          device: deviceFingerprint
        })`,
  `body: JSON.stringify({
          userId: currentUser.id,
          lat: deviceLat,
          lng: deviceLng,
          device: deviceFingerprint,
          livenessPhoto: finalPhoto
        })`
);

// 2. Modify capturePhoto to submit automatically
const targetCapturePhoto = `  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64Img = canvas.toDataURL('image/jpeg');
        setLivenessPhoto(base64Img);
        stopCamera();
      }
    } else {
      // Automatic fallback simulated photo using Dicebear
      const simulatedSeed = Math.random().toString(36).substring(7);
      setLivenessPhoto(\`https://api.dicebear.com/7.x/identicon/svg?seed=\${simulatedSeed}\`);
      setShowCamera(false);
    }
  };`;
const replaceCapturePhoto = `  const capturePhoto = () => {
    let photoData = null;
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        photoData = canvas.toDataURL('image/jpeg');
      }
    } else {
      const simulatedSeed = Math.random().toString(36).substring(7);
      photoData = \`https://api.dicebear.com/7.x/identicon/svg?seed=\${simulatedSeed}\`;
    }
    
    setLivenessPhoto(photoData);
    stopCamera();
    
    if (mapModalAction === 'checkin') handleCheckIn(photoData);
    if (mapModalAction === 'checkout') handleCheckOut(photoData);
  };`;
code = code.replace(targetCapturePhoto, replaceCapturePhoto);

// 3. Modify the Map modal button to check geofence before proceeding
const targetModalButton = `              <button
                type="button"
                onClick={() => {
                  setShowCheckInMapModal(false);
                  if (mapModalAction === 'checkin') handleCheckIn();
                  if (mapModalAction === 'checkout') handleCheckOut();
                }}
                className={\`w-full text-white font-semibold py-3.5 rounded-xl shadow-sm transition flex items-center justify-center gap-2.5 text-xs cursor-pointer \${mapModalAction === 'checkin' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-rose-600 hover:bg-rose-700'}\`}
              >
                {mapModalAction === 'checkin' ? <CheckCircle2 className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
                <span>{mapModalAction === 'checkin' ? 'Konfirmasi Check-In' : 'Konfirmasi Check-Out'}</span>
              </button>`;
const replaceModalButton = `              <button
                type="button"
                onClick={() => {
                  setShowCheckInMapModal(false);
                  if (currentGeofenceStatus === 'outside') {
                    startCamera();
                  } else {
                    if (mapModalAction === 'checkin') handleCheckIn(null);
                    if (mapModalAction === 'checkout') handleCheckOut(null);
                  }
                }}
                className={\`w-full text-white font-semibold py-3.5 rounded-xl shadow-sm transition flex items-center justify-center gap-2.5 text-xs cursor-pointer \${mapModalAction === 'checkin' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-rose-600 hover:bg-rose-700'}\`}
              >
                {mapModalAction === 'checkin' ? <CheckCircle2 className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
                <span>{currentGeofenceStatus === 'outside' ? 'Lanjut Verifikasi Wajah (Luar Area)' : (mapModalAction === 'checkin' ? 'Konfirmasi Check-In' : 'Konfirmasi Check-Out')}</span>
              </button>`;
code = code.replace(targetModalButton, replaceModalButton);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched camera and map modal logic.");

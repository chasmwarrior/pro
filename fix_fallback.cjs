const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldLogic = `        if (livePos) {
          w.currentLat = livePos.lat;
          w.currentLng = livePos.lng;
        } else {
          // Fallback to check-in location ONLY if we have no socket ping yet, but wipe currentLat/Lng otherwise.
          w.currentLat = record.checkInLat;
          w.currentLng = record.checkInLng;
        }`;

const newLogic = `        if (livePos) {
          w.currentLat = livePos.lat;
          w.currentLng = livePos.lng;
        } else {
          // Explicitly clear location if there's no live socket data to ensure accurate tracking
          // The user explicitly requested to NOT use data from check-in.
          w.currentLat = undefined;
          w.currentLng = undefined;
        }`;

if (content.includes(oldLogic)) {
  content = content.replace(oldLogic, newLogic);
  fs.writeFileSync('src/App.tsx', content);
  console.log("Updated fallback logic successfully.");
} else {
  console.log("Could not find the fallback logic to replace.");
}

const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Add states
const adminSubTabStr = "const [adminSubTab, setAdminSubTab] = useState<'radar' | 'approvals' | 'locations' | 'unbind' | 'announcements' | 'settings' | 'export' | 'reset'>('radar');";
const statesToAdd = `
  const [radarFilterDivision, setRadarFilterDivision] = useState<string>('all');
  const [radarFilterStatus, setRadarFilterStatus] = useState<string>('all');
`;
code = code.replace(adminSubTabStr, adminSubTabStr + statesToAdd);

// Add logic near monthlyKPIData
const kpiDataStr = "const monthlyKPIData = React.useMemo(() => {";
const memoToAdd = `
  const radarWorkersWithStatus = React.useMemo(() => {
    return allWorkers.map(w => {
      let status: 'working' | 'out_of_area' | 'offline' = 'offline';
      
      const record = attendanceRecords.find(r => r.userId === w.id && r.date === todayDateStr);
      if (record && !record.checkOutTime) {
        status = 'working';
        if (w.currentLat && w.currentLng) {
          let isInside = false;
          locations.forEach(loc => {
            const R = 6371e3;
            const dLat = ((loc.lat - w.currentLat) * Math.PI) / 180;
            const dLon = ((loc.lng - w.currentLng) * Math.PI) / 180;
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos((w.currentLat * Math.PI) / 180) *
                Math.cos((loc.lat * Math.PI) / 180) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c;
            if (distance <= loc.radiusMeter) isInside = true;
          });
          if (!isInside) status = 'out_of_area';
        } else {
           status = 'offline';
        }
      }
      return { ...w, todayStatus: status };
    });
  }, [allWorkers, attendanceRecords, locations, todayDateStr]);

  const filteredRadarWorkers = React.useMemo(() => {
    return radarWorkersWithStatus.filter(w => {
      if (radarFilterDivision !== 'all' && w.division !== radarFilterDivision) return false;
      if (radarFilterStatus !== 'all' && w.todayStatus !== radarFilterStatus) return false;
      return true;
    });
  }, [radarWorkersWithStatus, radarFilterDivision, radarFilterStatus]);

`;
code = code.replace(kpiDataStr, memoToAdd + kpiDataStr);

fs.writeFileSync('src/App.tsx', code);

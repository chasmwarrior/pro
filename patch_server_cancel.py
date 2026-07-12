import re

with open('server.ts', 'r') as f:
    content = f.read()

cancel_endpoint = """
// User cancels their own leave request
app.post('/api/leaves/cancel', (req, res) => {
  const { leaveId, userId } = req.body;
  const db = readDB();

  const leaveIndex = db.leaveRequests.findIndex((l: any) => l.id === leaveId && l.userId === userId);

  if (leaveIndex === -1) {
    return res.status(404).json({ error: 'Pengajuan libur tidak ditemukan atau Anda tidak memiliki akses.' });
  }

  const leave = db.leaveRequests[leaveIndex];

  // Calculate if it's at least 1 day before
  const leaveDate = new Date(leave.date);
  const today = new Date();

  // Reset times to midnight for accurate date comparison
  leaveDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  // Time difference in milliseconds
  const diffTime = leaveDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 1) {
    return res.status(400).json({ error: 'Libur hanya dapat dibatalkan maksimal 1 hari sebelum tanggal berlaku.' });
  }

  // Restore quota if it was already approved
  if (leave.status === 'approved') {
    const user = db.users.find((u: any) => u.id === userId);
    if (user) {
      user.leaveQuota.libur += 1;
    }
  }

  db.leaveRequests.splice(leaveIndex, 1);
  writeDB(db);

  res.json({ success: true, message: 'Pengajuan libur berhasil dibatalkan.' });
});

// Admin approves a pending check-in (outside office or late)
"""

content = content.replace(
"""// Admin approves a pending check-in (outside office or late)""",
cancel_endpoint
)

with open('server.ts', 'w') as f:
    f.write(content)

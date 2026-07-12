import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Update Kelola Pegawai save logic
content = content.replace(
"""                                    onClick={() => {
                                      const newLibur = prompt("Masukkan jumlah jatah libur baru untuk " + worker.username, String(worker.leaveQuota.libur));
                                      if (newLibur) {
                                        alert("Pengaturan jatah libur khusus untuk " + worker.username + " berhasil disimpan: " + newLibur + " hari.");
                                        // TODO: Implement actual API save for specific worker quotas
                                      }
                                    }}""",
"""                                    onClick={async () => {
                                      const newLibur = prompt("Masukkan jumlah jatah libur baru untuk " + worker.username, String(worker.leaveQuota.libur));
                                      if (newLibur !== null) {
                                        const res = await fetch('/api/users/update-quota', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ userId: worker.id, libur: Number(newLibur) })
                                        });
                                        if (res.ok) {
                                          alert("Pengaturan jatah libur khusus untuk " + worker.username + " berhasil disimpan: " + newLibur + " hari.");
                                          fetchAllWorkers();
                                        }
                                      }
                                    }}"""
)

with open('src/App.tsx', 'w') as f:
    f.write(content)

import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

handle_cancel = """  const handleCancelLeave = async (leaveId: string) => {
    if (!currentUser) return { success: false, message: 'Tidak diijinkan' };

    const res = await fetch('/api/leaves/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, leaveId })
    });
    const data = await res.json();
    fetchLeaveRequests();

    if (res.ok) {
      // Refresh current user info
      const usersRes = await fetch('/api/users');
      if (usersRes.ok) {
        const users = await usersRes.json();
        const updatedMe = users.find((u: any) => u.id === currentUser.id);
        if (updatedMe) {
          setCurrentUser(updatedMe);
        }
      }
    }
    return { success: res.ok, message: data.message || data.error || 'Gagal membatalkan libur' };
  };

  // --------------------------------------------------------------------------"""

content = content.replace(
"""  // --------------------------------------------------------------------------
  // USER PROFILE ACTIONS""",
handle_cancel + """
  // USER PROFILE ACTIONS"""
)

content = content.replace(
"""                  onApplyLeave={handleApplyLeave}
                />""",
"""                  onApplyLeave={handleApplyLeave}
                  onCancelLeave={handleCancelLeave}
                />"""
)


with open('src/App.tsx', 'w') as f:
    f.write(content)

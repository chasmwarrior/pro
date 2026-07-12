import re

with open('server.ts', 'r') as f:
    content = f.read()

secure_socket = """
// Minimal security check for socket connections via token/cookie passing or a handshake event
// Since we don't have true JWTs in this simple setup, we'll implement a basic handshake pattern
io.on('connection', (socket) => {
  let authenticatedUser: any = null;

  socket.on('authenticate', (data: { userId: string }) => {
    const db = readDB();
    const user = db.users.find((u: any) => u.id === data.userId);
    if (user) {
      authenticatedUser = user;
      socket.join('authenticated');
      if (user.role === 'admin' || user.role === 'supervisor') {
        socket.join('admins');
      }
    }
  });

  socket.on('workerLocationUpdate', (data: { userId: string, lat: number, lng: number }) => {
    if (!authenticatedUser || authenticatedUser.id !== data.userId) return; // Unauthenticated or spoofing

    // Broadcast only to admins
    io.to('admins').emit('radarUpdate', data);
  });
});
"""

content = content.replace(
"""io.on('connection', (socket) => {
  // Receive live location updates from workers
  socket.on('workerLocationUpdate', (data: { userId: string, lat: number, lng: number }) => {
    // Broadcast the update to admins/supervisors who are listening
    io.emit('radarUpdate', data);
  });
});""",
secure_socket
)

with open('server.ts', 'w') as f:
    f.write(content)

with open('src/App.tsx', 'r') as f:
    app_content = f.read()

# Update client socket
app_content = app_content.replace(
"""      const socket = io(apiBaseUrl || window.location.origin);

      const watchId = navigator.geolocation.watchPosition(""",
"""      const socket = io(apiBaseUrl || window.location.origin);
      socket.emit('authenticate', { userId: currentUser.id });

      const watchId = navigator.geolocation.watchPosition("""
)

app_content = app_content.replace(
"""    const socket = io(apiBaseUrl || window.location.origin);
    socket.on('radarUpdate', (data: { userId: string, lat: number, lng: number }) => {""",
"""    const socket = io(apiBaseUrl || window.location.origin);
    socket.emit('authenticate', { userId: currentUser.id });
    socket.on('radarUpdate', (data: { userId: string, lat: number, lng: number }) => {"""
)

with open('src/App.tsx', 'w') as f:
    f.write(app_content)

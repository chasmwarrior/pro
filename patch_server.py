import re

with open('server.ts', 'r') as f:
    content = f.read()

# Fix duplicate rules
content = content.replace(
"""        rules: [
          {"id": "r1", "name": "Bonus Tepat Waktu (Pagi)", "startTime": "00:00", "endTime": "10:00", "type": "bonus", "amount": 10000},
          {"id": "r2", "name": "Denda Telat Ringan", "startTime": "10:01", "endTime": "10:30", "type": "denda", "amount": 5000},
          {"id": "r3", "name": "Denda Telat Sedang", "startTime": "10:31", "endTime": "11:00", "type": "denda", "amount": 50000},
          {"id": "r4", "name": "Denda Telat Berat", "startTime": "11:01", "endTime": "23:59", "type": "denda", "amount": 100000},
          {"id": "r5", "name": "Lembur Jam ke-1", "startTime": "20:01", "endTime": "21:00", "type": "lembur", "amount": 20000}
        ],
        divisions: [""",
"""        divisions: ["""
)

with open('server.ts', 'w') as f:
    f.write(content)

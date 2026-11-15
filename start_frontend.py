import subprocess
import os

env = os.environ.copy()
env['VITE_API_BASE_URL'] = 'http://127.0.0.1:8000/api/v1'

# Find npm
npm_path = r'C:\Program Files\nodejs\npm.cmd'

proc = subprocess.Popen(
    [npm_path, 'run', 'dev'],
    cwd=r'C:\CandidateWorkspace\frontend',
    stdout=open(r'C:\Candidateworkspace\frontend.log', 'w'),
    stderr=subprocess.STDOUT,
    env=env
)
print('Frontend process started, PID:', proc.pid)
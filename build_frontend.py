import subprocess, os

env = os.environ.copy()
env['VITE_API_BASE_URL'] = 'http://127.0.0.1:8000/api/v1'

proc = subprocess.Popen(
    ['npm', 'run', 'build'],
    cwd=r'C:\CandidateWorkspace\frontend',
    stdout=open(r'C:\Candidateworkspace\build.log', 'w'),
    stderr=subprocess.STDOUT,
    env=env
)
print('Build process started, PID:', proc.pid)
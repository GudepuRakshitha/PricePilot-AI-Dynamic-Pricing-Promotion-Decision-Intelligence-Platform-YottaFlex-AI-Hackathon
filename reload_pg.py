import subprocess
result = subprocess.run(
    [r"C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe", "reload", "-D", r"C:\Program Files\PostgreSQL\18\data", "-l", "stderr"],
    capture_output=True, text=True
)
print("stdout:", result.stdout)
print("stderr:", result.stderr)
print("returncode:", result.returncode)
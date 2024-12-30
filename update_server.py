import subprocess
import sys

# 💠 인코딩 문제 해결
sys.stdout.reconfigure(encoding='utf-8')

def update_game(cmd_path, gameId, steamPath):
    """게임 업데이트"""
    command = [
        steamPath,
        "+login", "anonymous",
        "+force_install_dir", cmd_path,  #cmd 파싱 해야됨
        "+app_update", gameId, "validate",
        "+quit"
    ]
    try:
        print("게임 업데이트를 시작합니다...")
        process = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        print("게임 업데이트 완료.")
        return True
    except subprocess.CalledProcessError as e:
        print("업데이트 중 오류 발생:", e.stderr)
        return False
import subprocess
import sys

STEAMCMD_PATH = "C:\\path\\to\\steamcmd.exe"
APP_ID = "123456"
INSTALL_DIR = "C:\\path\\to\\game"
SERVER_EXECUTABLE = "C:\\path\\to\\server.exe"

def update_game():
    """게임 업데이트"""
    command = [
        STEAMCMD_PATH,
        "+login", "anonymous",
        "+force_install_dir", INSTALL_DIR,
        "+app_update", APP_ID, "validate",
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

def start_server():
    """게임 서버 실행"""
    try:
        print("서버를 시작합니다...")
        subprocess.Popen(SERVER_EXECUTABLE, shell=True)
        return "서버가 성공적으로 시작되었습니다."
    except Exception as e:
        return f"서버 시작 중 오류 발생: {str(e)}"

if __name__ == "__main__":
    action = sys.argv[1]
    if action == "start":
        if update_game():
            print(start_server())
        else:
            print("업데이트 실패. 서버를 시작하지 않습니다.")

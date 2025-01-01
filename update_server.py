import subprocess
import sys
import os

# 파이썬 출력 인코딩을 UTF-8로 변경
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
        subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        print("게임 업데이트 완료.")
    except subprocess.CalledProcessError as e:
        print("업데이트 중 오류 발생:", e.stderr)
    
def main():
    if len(sys.argv) < 4:
        print("[오류] 명령어 경로를 인수로 전달해주세요.")
        return

    cmd_path = sys.argv[1]  # 명령어 경로 인수로 전달 받음
    gameId = sys.argv[2] # 게임 서버 appId
    steamPath = sys.argv[3] # steamcmd 경로

    # cmd_path에 불필요한 큰따옴표 제거
    if cmd_path.startswith('"') and cmd_path.endswith('"'):
        cmd_path = cmd_path[1:-1]  # 양쪽의 큰따옴표 제거
    
    # 실행 파일이 포함된 경로에서 폴더 경로만 추출
    cmd_path = os.path.dirname(cmd_path)

    update_game(cmd_path, gameId, steamPath)

if __name__ == "__main__":
    main()
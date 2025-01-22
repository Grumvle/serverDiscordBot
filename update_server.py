import subprocess
import sys
import os

# Windows에서 UTF-8 설정 적용
if os.name == "nt":
    os.system("chcp 65001 > nul")

def update_game(cmd_path, gameId, steamPath):
    """게임 업데이트"""

    # 환경 변수 설정
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"  # Python 출력 인코딩 설정
    env["LANG"] = "en_US.UTF-8"       # SteamCMD 출력 인코딩 설정

    # SteamCMD 실행 권한 확인 및 수정 (Linux)
    if not os.access(steamPath, os.X_OK):
        print("[오류] SteamCMD 실행 권한이 없습니다. 실행 권한을 추가합니다.")
        os.chmod(steamPath, 0o755)

    # SteamCMD 실행 명령어 (리스트 형태로 구성)
    command = [
        steamPath, "+login", "anonymous",
        "+force_install_dir", cmd_path,
        "+app_update", gameId, "validate", "+quit"
    ]

    try:
        print(f"실행 명령어: {' '.join(command)}")
        # 쉘 명령 실행
        result = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            env=env,
            check=True
        )
        print(result.stdout)
        print("✅ 게임 업데이트가 완료되었습니다.")
    except subprocess.CalledProcessError as e:
        print(f"❌ 업데이트 중 오류 발생:\n{e.stderr}")
    except FileNotFoundError:
        print("❌ [오류] SteamCMD 경로를 찾을 수 없습니다.")
    except PermissionError as e:
        print(f"❌ [오류] 권한 문제가 발생했습니다. 관리자 권한으로 실행해주세요.\n세부 정보: {e}")

def main():
    if len(sys.argv) < 4:
        print("❌ [오류] 명령어 경로를 인수로 전달해주세요.\n사용법: python script.py <게임 설치 경로> <게임 ID> <SteamCMD 경로>")
        return

    cmd_path = sys.argv[1]
    gameId = sys.argv[2]
    steamPath = sys.argv[3]

    # cmd_path에 불필요한 큰따옴표 제거
    if cmd_path.startswith('"') and cmd_path.endswith('"'):
        cmd_path = cmd_path[1:-1]
    
    # cmd_path 디렉토리 확인
    if not os.path.exists(cmd_path):
        print(f"❌ [오류] 게임 설치 경로가 존재하지 않습니다: {cmd_path}")
        return

    update_game(cmd_path, gameId, steamPath)

if __name__ == "__main__":
    main()
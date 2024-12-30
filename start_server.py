import os
import sys
import time
import win32gui
import win32con
import win32process
import subprocess
import update_server

# 파이썬 출력 인코딩을 UTF-8로 변경
sys.stdout.reconfigure(encoding='utf-8')

def start_server(cmd_path):
    """CMD 명령어 또는 .exe 파일을 통해 서버를 실행합니다."""
    try:
        if cmd_path.lower().endswith('.exe'):
            # .exe 파일 직접 실행 (새로운 콘솔 창에서 실행)
            subprocess.Popen([cmd_path], creationflags=subprocess.CREATE_NEW_CONSOLE)
            print(f"[서버 시작] .exe 파일이 새로운 창에서 실행되었습니다: {cmd_path}")
        else:
            # CMD 명령어 실행 (새로운 CMD 창에서 실행)
            subprocess.Popen(['cmd', '/k', cmd_path], creationflags=subprocess.CREATE_NEW_CONSOLE)
            print(f"[서버 시작] 명령어: {cmd_path}")

            time.sleep(5)  # 5초 대기

            hwnd = get_window_handle_by_title("cmd.exe")
            if hwnd:
                win32gui.SetWindowText(hwnd, cmd_path)
                print(f"[성공] CMD 창의 제목이 '{cmd_path}'로 변경되었습니다.")
            else:
                print(f"[오류] CMD 창을 찾을 수 없습니다.")
    except Exception as e:
        print(f"[오류] 서버 시작 중 오류 발생: {e}")

def get_window_handle_by_title(title):
    """창 제목으로 윈도우 핸들을 가져옴"""
    def enum_windows_callback(hwnd, windows):
        if win32gui.IsWindowVisible(hwnd) and title.lower() in win32gui.GetWindowText(hwnd).lower():
            windows.append(hwnd)
    windows = []
    win32gui.EnumWindows(enum_windows_callback, windows)
    return windows[0] if windows else None

def main():
    if len(sys.argv) < 2:
        print("[오류] 명령어 경로를 인수로 전달해주세요.")
        return

    cmd_path = sys.argv[1]  # 명령어 경로 인수로 전달 받음
    gameId = sys.argv[2] # 게임 서버 appId
    steamPath = sys.argv[3] # steamcmd 경로

    # cmd_path에 불필요한 큰따옴표 제거
    if cmd_path.startswith('"') and cmd_path.endswith('"'):
        cmd_path = cmd_path[1:-1]  # 양쪽의 큰따옴표 제거

    if update_server.update_game(cmd_path, gameId, steamPath):
        start_server(cmd_path)
    else:
        print("업데이트 실패. 서버를 시작하지 않습니다.")

if __name__ == "__main__":
    main()

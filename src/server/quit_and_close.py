import win32gui
import win32con
import ctypes
import pyautogui
import time
import sys

# 💠 인코딩 문제 해결
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

# 🔧 **WinAPI 함수 설정**
user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

def find_window_by_title_partial(title_partial):
    """창 제목의 일부 문자열과 일치하는 윈도우 핸들을 찾는 함수"""
    def window_enumeration_handler(hwnd, results):
        window_title = win32gui.GetWindowText(hwnd)
        if title_partial.lower() in window_title.lower():
            results.append(hwnd)
    
    matching_hwnds = []
    win32gui.EnumWindows(window_enumeration_handler, matching_hwnds)
    if matching_hwnds:
        print(f"🔍 찾은 창 핸들 목록: {matching_hwnds}")
    return matching_hwnds[0] if matching_hwnds else None

def get_window_rect(hwnd):
    """윈도우 핸들의 위치 및 크기를 가져옵니다."""
    rect = win32gui.GetWindowRect(hwnd)
    print(f"🖥️ 창 위치 및 크기: {rect}")
    return rect

def set_foreground_window(hwnd):
    """CMD 창을 포커스 및 맨 앞으로 가져옵니다."""
    try:
        win32gui.BringWindowToTop(hwnd)  # 창을 최상단으로 이동
        win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)  # 창을 복원 (최소화된 경우 대비)
        time.sleep(0.5)  # 약간의 지연

        current_thread_id = kernel32.GetCurrentThreadId()
        target_thread_id = user32.GetWindowThreadProcessId(hwnd, None)
        
        user32.AttachThreadInput(target_thread_id, current_thread_id, True)
        result = win32gui.SetForegroundWindow(hwnd)
        user32.AttachThreadInput(target_thread_id, current_thread_id, False)
        
        print(f"✅ SetForegroundWindow 결과: {result}")
        return True
    except Exception as e:
        print(f"❌ SetForegroundWindow 오류 발생: {e}")
        return False

def retry_foreground_window(hwnd, retries=5, delay=0.2):
    """포커스를 여러 번 재시도하는 함수"""
    for attempt in range(retries):
        if set_foreground_window(hwnd):
            print(f"✅ 포커스 성공 (시도 {attempt + 1}/{retries})")
            return True
        print(f"❌ 포커스 실패 (시도 {attempt + 1}/{retries})")
        time.sleep(delay)
    return False

def send_quit_command_to_console(window_title_partial):
    """윈도우 창 제목에 일치하는 CMD에 quit 명령어를 보냅니다."""
    hwnd = find_window_by_title_partial(window_title_partial)
    if hwnd is None:
        print(f"❌ 창 제목에 '{window_title_partial}'가 포함된 창을 찾을 수 없습니다.")
        return

    print(f"🔍 윈도우 핸들(HWND): {hwnd}")
    
    if not retry_foreground_window(hwnd):
        print(f"❌ '{window_title_partial}' 창을 포커스할 수 없습니다. 권한 문제일 수 있습니다.")
        return

    try:
        # **창 중앙을 강제로 클릭하여 입력 포커스 확보**
        x1, y1, x2, y2 = get_window_rect(hwnd)
        center_x = (x1 + x2) // 2
        center_y = (y1 + y2) // 2
        pyautogui.click(center_x, center_y)  # **중앙 클릭으로 포커스 강제 확보**
        
        print(f"🛠️ '{window_title_partial}' 창에 'quit' 명령어 전송 중...")
        pyautogui.typewrite("quit")  # **quit 입력**
        time.sleep(0.5)
        pyautogui.press("enter")  # **엔터 전송**
        print(f"✅ 'quit' 명령어가 '{window_title_partial}' 창에 전송되었습니다.")
    except Exception as e:
        print(f"❌ 'quit' 명령어 전송 중 오류 발생: {e}")

def close_window_after_timeout(window_title_partial, timeout=15):
    """지정된 시간(기본값: 15초)이 지나면 CMD 창을 닫습니다."""
    hwnd = find_window_by_title_partial(window_title_partial)
    if hwnd is None:
        print(f"❌ 창 제목에 '{window_title_partial}'가 포함된 창을 찾을 수 없습니다.")
        return
    
    print(f"⌛ {timeout}초 후에 '{window_title_partial}' 창을 닫습니다.")
    for i in range(timeout):
        time.sleep(1)
        print(f"⌛ 남은 시간: {timeout - i}초")
    
    try:
        win32gui.PostMessage(hwnd, win32con.WM_CLOSE, 0, 0)
        print(f"✅ '{window_title_partial}' 창을 닫았습니다.")
    except Exception as e:
        print(f"❌ 창 닫기 중 오류 발생: {e}")

def main():
    window_title = sys.argv[1] if len(sys.argv) > 1 else 'StartServer64.bat'
    send_quit_command_to_console(window_title)
    print('⌛ 감지 중... 15초 후에 CMD 창을 닫습니다.')
    close_window_after_timeout(window_title, timeout=15)

if __name__ == '__main__':
    main()

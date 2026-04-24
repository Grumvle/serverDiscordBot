import ctypes
import subprocess
import sys
import time

kernel32 = ctypes.windll.kernel32
sys.stdout.reconfigure(encoding='utf-8')

CREATE_NEW_PROCESS_GROUP = 0x00000200
CTRL_C_EVENT = 0
CTRL_BREAK_EVENT = 1

def process_exists(pid: int) -> bool:
    SYNCHRONIZE = 0x00100000
    handle = kernel32.OpenProcess(SYNCHRONIZE, False, pid)
    if not handle:
        return False
    still_running = kernel32.WaitForSingleObject(handle, 0) == 258  # WAIT_TIMEOUT
    kernel32.CloseHandle(handle)
    return still_running

def send_console_event(pid: int, event: int) -> bool:
    helper = (
        f"import ctypes,sys,signal;"
        f"signal.signal(signal.SIGINT,signal.SIG_IGN);"
        f"k=ctypes.windll.kernel32;"
        f"pid=int(sys.argv[1]);"
        f"k.FreeConsole();"
        f"ok=k.AttachConsole(pid);"
        f"(sys.exit(1)) if not ok else None;"
        f"k.SetConsoleCtrlHandler(None,True);"
        f"r=k.GenerateConsoleCtrlEvent({event},0);"
        f"sys.exit(0 if r else 1)"
    )
    try:
        result = subprocess.run(
            [sys.executable, '-c', helper, str(pid)],
            creationflags=CREATE_NEW_PROCESS_GROUP,
            capture_output=True,
            timeout=10,
        )
        return result.returncode == 0
    except subprocess.TimeoutExpired:
        return False

def send_wm_close(pid: int) -> None:
    subprocess.run(
        ['taskkill', '/PID', str(pid)],
        capture_output=True,
    )

def wait_for_exit(pid: int, seconds: int) -> bool:
    for elapsed in range(seconds):
        if not process_exists(pid):
            print(f"✅ 프로세스가 종료되었습니다. ({elapsed + 1}초 소요)")
            return True
        time.sleep(1)
    return False

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: send_ctrlc.py <pid>", file=sys.stderr)
        sys.exit(1)

    pid = int(sys.argv[1])

    # Stage 1: CTRL_C_EVENT — wait 30s (servers may take time to save data)
    ok1 = send_console_event(pid, CTRL_C_EVENT)
    print(f"{'✅' if ok1 else '⚠️'} CTRL_C_EVENT {'전송' if ok1 else '전송 실패(콘솔 없음)'}. 30초 대기 중...")
    sys.stdout.flush()
    if wait_for_exit(pid, 30):
        sys.exit(0)

    # Stage 2: CTRL_BREAK_EVENT
    print("⚠️ CTRL_BREAK_EVENT로 에스컬레이션...")
    sys.stdout.flush()
    send_console_event(pid, CTRL_BREAK_EVENT)
    if wait_for_exit(pid, 15):
        sys.exit(0)

    # Stage 3: WM_CLOSE / CTRL_CLOSE_EVENT via taskkill (no /F)
    # Ignore the return value — process may already be dying from earlier signals.
    print("⚠️ WM_CLOSE(taskkill /PID)로 에스컬레이션...")
    sys.stdout.flush()
    send_wm_close(pid)
    if wait_for_exit(pid, 30):
        sys.exit(0)

    print("❌ 프로세스가 종료되지 않았습니다. 'kill' 명령어로 강제 종료하세요.", file=sys.stderr)
    sys.exit(1)

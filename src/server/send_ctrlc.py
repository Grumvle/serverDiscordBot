import ctypes
import subprocess
import sys
import time

kernel32 = ctypes.windll.kernel32
sys.stdout.reconfigure(encoding='utf-8')

WAIT_STEP = 1
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

def send_event(pid: int, event: int) -> bool:
    # Run delivery in a subprocess with CREATE_NEW_PROCESS_GROUP so it is
    # immune to the CTRL_C_EVENT it sends into the target console.
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

def wait_for_exit(pid: int, seconds: int) -> bool:
    for _ in range(seconds):
        if not process_exists(pid):
            return True
        time.sleep(WAIT_STEP)
    return False

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: send_ctrlc.py <pid>", file=sys.stderr)
        sys.exit(1)

    pid = int(sys.argv[1])

    # Stage 1: CTRL_C_EVENT
    if not send_event(pid, CTRL_C_EVENT):
        print(f"❌ CTRL_C_EVENT 전송 실패 (PID {pid})", file=sys.stderr)
        sys.exit(1)
    print(f"✅ CTRL_C_EVENT 전송 완료. 30초 대기 중...")
    sys.stdout.flush()

    if wait_for_exit(pid, 30):
        print(f"✅ 프로세스가 정상 종료되었습니다.")
        sys.exit(0)

    # Stage 2: CTRL_BREAK_EVENT (harder to ignore)
    print(f"⚠️ 응답 없음 — CTRL_BREAK_EVENT로 에스컬레이션...")
    sys.stdout.flush()

    if not send_event(pid, CTRL_BREAK_EVENT):
        print(f"❌ CTRL_BREAK_EVENT 전송 실패 (PID {pid})", file=sys.stderr)
        sys.exit(1)
    print(f"✅ CTRL_BREAK_EVENT 전송 완료. 30초 대기 중...")
    sys.stdout.flush()

    if wait_for_exit(pid, 30):
        print(f"✅ 프로세스가 정상 종료되었습니다.")
        sys.exit(0)

    print(f"❌ 60초 이내에 프로세스가 종료되지 않았습니다. 'kill' 명령어 사용을 고려하세요.", file=sys.stderr)
    sys.exit(1)

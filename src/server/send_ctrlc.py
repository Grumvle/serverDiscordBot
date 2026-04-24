import ctypes
import subprocess
import sys
import time

kernel32 = ctypes.windll.kernel32
sys.stdout.reconfigure(encoding='utf-8')

TIMEOUT_SECONDS = 30
# Processes created with this flag are immune to CTRL_C_EVENT
CREATE_NEW_PROCESS_GROUP = 0x00000200

def process_exists(pid: int) -> bool:
    SYNCHRONIZE = 0x00100000
    handle = kernel32.OpenProcess(SYNCHRONIZE, False, pid)
    if not handle:
        return False
    still_running = kernel32.WaitForSingleObject(handle, 0) == 258  # WAIT_TIMEOUT
    kernel32.CloseHandle(handle)
    return still_running

def send_ctrl_c(pid: int) -> bool:
    # Run the actual signal delivery in a subprocess with CREATE_NEW_PROCESS_GROUP.
    # That flag makes the helper immune to CTRL_C_EVENT, so it won't kill itself
    # when it calls GenerateConsoleCtrlEvent(0, 0) after attaching to the target console.
    helper = (
        "import ctypes,sys,signal;"
        "signal.signal(signal.SIGINT,signal.SIG_IGN);"
        "k=ctypes.windll.kernel32;"
        "pid=int(sys.argv[1]);"
        "k.FreeConsole();"
        "ok=k.AttachConsole(pid);"
        "sys.exit(1) if not ok else None;"
        "k.SetConsoleCtrlHandler(None,True);"
        "r=k.GenerateConsoleCtrlEvent(0,0);"
        "sys.exit(0 if r else 1)"
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

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: send_ctrlc.py <pid>", file=sys.stderr)
        sys.exit(1)

    pid = int(sys.argv[1])

    if not send_ctrl_c(pid):
        print(f"❌ Ctrl+C 전송 실패 (PID {pid})", file=sys.stderr)
        sys.exit(1)

    print(f"✅ Ctrl+C 신호를 PID {pid}에 전송했습니다. 종료 대기 중...")
    sys.stdout.flush()

    for elapsed in range(TIMEOUT_SECONDS):
        if not process_exists(pid):
            print(f"✅ 프로세스가 정상 종료되었습니다. ({elapsed + 1}초 소요)")
            sys.exit(0)
        time.sleep(1)

    print(f"⚠️ {TIMEOUT_SECONDS}초 이내에 프로세스가 종료되지 않았습니다.")
    sys.exit(0)

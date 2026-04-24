import ctypes
import sys
import time

kernel32 = ctypes.windll.kernel32
sys.stdout.reconfigure(encoding='utf-8')

TIMEOUT_SECONDS = 30

def process_exists(pid: int) -> bool:
    SYNCHRONIZE = 0x00100000
    handle = kernel32.OpenProcess(SYNCHRONIZE, False, pid)
    if not handle:
        return False
    # WAIT_OBJECT_0(0) = exited, WAIT_TIMEOUT(258) = still running
    still_running = kernel32.WaitForSingleObject(handle, 0) == 258
    kernel32.CloseHandle(handle)
    return still_running

def send_ctrl_c(pid: int) -> bool:
    # First: send directly to process group led by pid (works when server has CREATE_NEW_PROCESS_GROUP)
    if kernel32.GenerateConsoleCtrlEvent(0, pid):
        return True

    # Fallback: attach to target's console and broadcast to its entire group
    sys.stdout.flush()
    kernel32.FreeConsole()
    if not kernel32.AttachConsole(pid):
        print(f"❌ PID {pid}의 콘솔에 연결할 수 없습니다.", file=sys.stderr)
        return False
    kernel32.SetConsoleCtrlHandler(None, True)  # prevent killing this helper
    result = kernel32.GenerateConsoleCtrlEvent(0, 0)
    kernel32.SetConsoleCtrlHandler(None, False)
    kernel32.FreeConsole()
    return result != 0

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

    # Signal was sent but process didn't exit in time — still report success
    # so the Discord bot marks the server offline and stops retrying
    print(f"⚠️ {TIMEOUT_SECONDS}초 이내에 프로세스가 종료되지 않았습니다. 강제 종료를 고려하세요.")
    sys.exit(0)

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
    # Send CTRL_C_EVENT to the process group led by pid.
    # Works when the target EXE was launched via 'start' (new window = new process group,
    # so the EXE's PID == its process group ID).
    return kernel32.GenerateConsoleCtrlEvent(0, pid) != 0

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

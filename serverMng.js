import fs from 'fs';
import { spawn, exec } from 'child_process';
import 'dotenv/config';

const filePath = process.env.filePath;

// 실행 중인 서버를 관리할 객체
const runningServers = {};

// 📁 **서버 경로 유효성 검사 함수**
export function validateServerPath(path) {
    path = path.replace(/\\\\/g, '\\');
    if (!path.startsWith('"') && !path.endsWith('"')) {
        path = `"${path}"`;
    }
    return path;
}

/// 📁 서버 정보 로드
export function loadServers() {
    try {
        if (!fs.existsSync(filePath)) {
            console.log('📂 servers.json 파일이 존재하지 않아 새로 생성합니다.');
            fs.writeFileSync(filePath, JSON.stringify({}, null, 4), 'utf8');
        }

        const fileContents = fs.readFileSync(filePath, 'utf8');
        if (!fileContents) {
            return {};
        }
        return JSON.parse(fileContents);
    } catch (error) {
        console.error('❌ 서버 정보 파일을 불러오는 중 오류가 발생했습니다.', error);
        return {}; 
    }
}

// 📁 서버 정보 저장
export function saveServers(servers) {
    try {
        if (!filePath) {
            throw new Error('❌ 환경변수 "filePath"가 정의되지 않았습니다. .env 파일을 확인하세요.');
        }
        fs.writeFileSync(filePath, JSON.stringify(servers, null, 4), 'utf8');
    } catch (error) {
        console.error('❌ 서버 정보를 저장하는 중 오류가 발생했습니다.', error);
    }
}

// 📁 서버 추가 기능
export function handleAddServer(message, args) {
    const input = message.content.match(/"([^"]+)"|(\S+)/g);
    if (!input || input.length < 5) {
        message.reply('❌ 사용법: `$서버추가 [게임 이름] [서버 경로] [설명] [종료 명령어]`\n예: `$서버추가 "pzserver" "D:\\Dedicated Servers\\Project Zomboid Dedicated Server\\StartServer64.bat" "프로젝트 좀보이드 서버" quit`');
        return;
    }

    const gameName = input[1].replace(/"/g, '').trim();
    let serverPath = input[2].replace(/"/g, '').trim();
    const detail = input[3].replace(/"/g, '').trim();
    const stopCommand = input[4].replace(/"/g, '').trim();

    serverPath = validateServerPath(serverPath);

    const servers = loadServers();
    if (servers[gameName]) {
        message.reply(`❌ **${gameName}** 서버는 이미 존재합니다.`);
        return;
    }

    servers[gameName] = {
        path: serverPath,
        detail: detail,
        stopCommand: stopCommand
    };

    saveServers(servers);
    message.reply(`✅ **${gameName}** 서버 추가 완료.\n📂 경로: **${serverPath}**\n📄 설명: **${detail}**`);
}

// 📁 서버 제거 기능
export function handleRemoveServer(message, args) {
    const input = message.content.match(/"([^"]+)"|(\S+)/g);
    if (!input || input.length < 2) {
        message.reply('❌ 사용법: `$서버제거 [게임 이름]`\n예: `$서버제거 "pzserver"`');
        return;
    }

    const gameName = input[1].replace(/"/g, '').trim();
    const servers = loadServers();

    if (!servers[gameName]) {
        message.reply(`❌ **${gameName}** 서버를 찾을 수 없습니다.`);
        return;
    }

    delete servers[gameName];
    saveServers(servers);
    message.reply(`🗑️ **${gameName}** 서버가 목록에서 제거되었습니다.`);
}

// 📁 서버 목록 출력
export function handleListServers(message) {
    const servers = loadServers();
    if (Object.keys(servers).length === 0) {
        message.reply('등록된 서버가 없습니다.');
    } else {
        let response = '등록된 서버 목록:\n';
        for (const [key, server] of Object.entries(servers)) {
            const detail = server.detail || '상세 정보 없음';
            response += `- ${key}: ${detail}\n`;
        }
        message.reply(response);
    }
}

/**
 * 🔍 **프로세스 이름으로 PID를 가져오는 함수**
 * @param {string} processName - 찾고자 하는 프로세스의 이름 (예: PalServer.exe)
 * @returns {Promise<number>} - 찾은 프로세스의 PID를 반환
 */
export function getProcessPID(processName) {
    return new Promise((resolve, reject) => {
        try {
            exec(`tasklist | findstr /I "${processName}"`, (error, stdout) => {
                if (error) {
                    return reject(new Error(`❌ **${processName}** 프로세스를 찾을 수 없습니다.`));
                }
                // **PID 추출**: "PalServer.exe  10828 Console 1 27,456 K" 같은 출력에서 PID(10828)만 가져옵니다.
                const pidMatch = stdout.match(/\b\d+\b/); // 첫 번째 숫자 (PID) 찾기
                if (pidMatch) {
                    const pid = parseInt(pidMatch[0], 10);
                    resolve(pid);
                } else {
                    reject(new Error(`❌ **${processName}** 프로세스의 PID를 찾을 수 없습니다.`));
                }
            });
        } catch (error) {
            reject(new Error(`❌ 프로세스 PID를 가져오는 중 오류가 발생했습니다: ${error.message}`));
        }
    });
}

// 📁 **서버 시작 기능**
export function handleStartServer(client, message, args) {
    const input = message.content.match(/"([^"]+)"|(\S+)/g); // 명령어에서 입력을 파싱
    if (!input || input.length < 2) {
        message.reply('❌ 사용법: `$서버시작 [게임 이름]`\n예: `$서버시작 "pzserver"`');
        return;
    }

    const gameName = input[1].replace(/"/g, '').trim();
    const servers = loadServers();

    if (!servers[gameName]) {
        message.reply(`❌ **${gameName}** 서버를 찾을 수 없습니다.`);
        return;
    }

    let serverPath = servers[gameName].path;

    try {
        // 1️⃣ **경로에 공백이 있으면 큰따옴표로 감싸기**
        if (!serverPath.startsWith('"') && !serverPath.endsWith('"')) {
            serverPath = `"${serverPath}"`;
        }

        console.log(`🚀 실행 명령어: start "" ${serverPath}`);

        // 2️⃣ **CMD 명령어로 실행 (중요: 첫 번째 "" 인수는 창 제목을 의미)**
        const serverProcess = spawn('cmd.exe', ['/c', `start "" ${serverPath}`], { 
            shell: true, 
            detached: true, 
            stdio: 'ignore' 
        });

        serverProcess.unref();

        // 3️⃣ **서버 경로에서 파일명 추출 (파일명만 가져오기)**
        const processName = serverPath.replace(/"/g, '').split('\\').pop(); // 파일명 추출

        message.reply(`🚀 **${gameName}** 서버를 실행했습니다. 프로세스를 찾는 중...`);

        // 4️⃣ **5초 후에 PID 가져오기 (비동기)**
        setTimeout(() => {
            getProcessPID(processName)
                .then(pid => {
                    if (pid) {
                        runningServers[gameName] = pid;
                        message.reply(`✅ **${gameName}** 서버의 PID: ${pid}`);
                    } else {
                        message.reply(`❌ **${gameName}** 서버의 PID를 찾을 수 없습니다.`);
                    }
                })
                .catch(error => {
                    console.error(`❌ PID 조회 중 오류 발생: ${error.message}`);
                    message.reply(`❌ **${gameName}** 서버의 PID를 찾는 중 오류가 발생했습니다.`);
                });
        }, 5000); // 5초 후에 PID 가져오기

    } catch (error) {
        console.error(`❌ 서버 시작 중 오류 발생: ${error.message}`);
        message.reply(`❌ **${gameName}** 서버 시작 중 오류가 발생했습니다.`);
    }
}


// 📁 **서버 정지 기능**
export function handleStopServer(client, message, args) {
    const input = message.content.split(' ');
    const gameName = input[1]?.trim();

    if (!gameName) {
        message.reply('❌ 사용법: `$서버종료 [게임 이름]`\n예: `$서버종료 "pzserver"`');
        return;
    }

    const servers = loadServers();
    if (!servers[gameName]) {
        message.reply(`❌ **${gameName}** 서버를 찾을 수 없습니다.`);
        return;
    }

    const serverInfo = servers[gameName];
    const { stopCommand, path } = serverInfo;

    if (!runningServers[gameName]) {
        message.reply(`❌ **${gameName}** 서버는 실행 중이지 않습니다.`);
        return;
    }

    const pid = runningServers[gameName];

    if (!stopCommand) {
        message.reply(`❌ **${gameName}** 서버의 종료 명령어가 설정되지 않았습니다.`);
        return;
    }

    if (stopCommand === 'kill') {
        // **Kill 명령어인 경우 프로세스를 강제 종료**
        killProcessByPID(pid)
            .then(() => {
                delete runningServers[gameName];
                message.reply(`🛑 **${gameName}** 서버를 강제로 종료했습니다.`);
            })
            .catch(error => {
                console.error(`❌ 서버 정지 중 오류 발생: ${error.message}`);
                message.reply(`❌ **${gameName}** 서버 강제 종료 중 오류가 발생했습니다.`);
            });
    } else {
        // **Quit 명령어인 경우 서버에 종료 명령어 전송**
        sendStopCommandToServer(gameName, stopCommand)
            .then(() => {
                message.reply(`🛑 **${gameName}** 서버에 종료 명령어 "${stopCommand}" 를 보냈습니다.`);

                // **종료 메시지가 감지되었는지 확인 후, 감지되면 창 닫기**
                waitForServerShutdown(gameName, pid)
                    .then(() => {
                        message.reply(`📦 **${gameName}** 서버 종료가 완료되었습니다.`);
                        delete runningServers[gameName];
                    })
                    .catch(error => {
                        console.error(`❌ 서버 종료 중 오류 발생: ${error.message}`);
                        message.reply(`❌ **${gameName}** 서버 종료 중 오류가 발생했습니다.`);
                    });
            })
            .catch(error => {
                console.error(`❌ 종료 명령어 전송 중 오류 발생: ${error.message}`);
                message.reply(`❌ **${gameName}** 서버 종료 명령어 전송 중 오류가 발생했습니다.`);
            });
    }
}

/**
 * 🛑 **서버에 종료 명령어를 전송하는 함수**
 */
function sendStopCommandToServer(gameName, stopCommand) {
    return new Promise((resolve, reject) => {
        const serverProcess = runningServers[gameName];
        if (!serverProcess) {
            return reject(new Error('실행 중인 서버 프로세스를 찾을 수 없습니다.'));
        }

        try {
            serverProcess.stdin.write(`${stopCommand}\n`);
            serverProcess.stdin.end();
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * 📡 **서버가 "Press any key to continue..." 메시지를 출력할 때까지 대기**
 */
function waitForServerShutdown(gameName, pid) {
    return new Promise((resolve, reject) => {
        let timeout = 15000; // 15초 동안 대기 (서버가 저장하는 데 시간이 걸릴 수 있음)
        let checkInterval = 3000; // 3초마다 로그를 확인

        const interval = setInterval(() => {
            console.log(`🔍 **${gameName}** 서버의 종료 상태를 확인 중...`);
            checkForPressAnyKey(pid)
                .then(isReadyToClose => {
                    if (isReadyToClose) {
                        clearInterval(interval);
                        killProcessByPID(pid) // CMD 창 닫기
                            .then(resolve)
                            .catch(reject);
                    }
                })
                .catch(reject);
        }, checkInterval);

        setTimeout(() => {
            clearInterval(interval);
            reject(new Error('서버가 종료 상태를 감지하지 못했습니다.'));
        }, timeout);
    });
}

/**
 * 🔍 **"Press any key to continue..." 메시지를 확인하는 함수**
 */
function checkForPressAnyKey(pid) {
    return new Promise((resolve, reject) => {
        exec(`tasklist | findstr /I "conhost.exe"`, (error, stdout) => {
            if (error) return reject(error);
            if (stdout.includes('Press any key to continue' || '계속하려면 아무 키나 누르십시오')) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
}

/**
 * 🔪 **PID로 프로세스를 종료하는 함수**
 */
function killProcessByPID(pid) {
    return new Promise((resolve, reject) => {
        try {
            process.kill(pid, 'SIGKILL');
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

// 실행 중인 서버 목록 확인
export function handleRunningServers(message) {
    const running = Object.keys(runningServers);
    if (running.length === 0) {
        message.reply('현재 실행 중인 서버가 없습니다.');
    } else {
        message.reply(`실행 중인 서버 목록:\n- ${running.join('\n- ')}`);
    }
}
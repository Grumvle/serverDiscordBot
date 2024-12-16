import fs from 'fs';
import { spawn } from 'child_process';
import 'dotenv/config';
import { botCommand, serverCommands, ladderCommands, teamCommands, drawCommands } from './botCommands.js';

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

// 📁 **서버 시작 기능**
export function handleStartServer(client, message, args) {
    const input = message.content.match(/"([^"]+)"|(\S+)/g);
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
        const serverProcess = spawn('cmd.exe', ['/c', `start "" ${serverPath}`], { 
            shell: true, 
            detached: true, 
            stdio: 'ignore' 
        });

        serverProcess.unref();

        const processName = serverPath.split('\\').pop(); // 파일명만 추출
        message.reply(`🚀 **${gameName}** 서버를 실행했습니다. 프로세스를 찾는 중...`);

        setTimeout(() => {
            getProcessPID(processName)
                .then(pid => {
                    if (pid) {
                        runningServers[gameName] = pid;
                        message.reply(`✅ **${gameName}** 서버의 PID: ${pid}`);
                    } else {
                        message.reply(`❌ **${gameName}** 서버의 PID를 찾을 수 없습니다.`);
                    }
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
        message.reply('❌ 사용법: `$서버정지 [게임 이름]`\n예: `$서버정지 "pzserver"`');
        return;
    }

    const servers = loadServers();
    if (!servers[gameName]) {
        message.reply(`❌ **${gameName}** 서버를 찾을 수 없습니다.`);
        return;
    }

    const stopCommand = servers[gameName].stopCommand;
    const serverPID = runningServers[gameName];

    if (!serverPID) {
        message.reply(`❌ **${gameName}** 서버의 PID를 찾을 수 없습니다.`);
        return;
    }

    try {
        if (stopCommand.toLowerCase() === 'kill') {
            exec(`taskkill /PID ${serverPID} /F`, (error) => {
                if (error) {
                    message.reply(`❌ **${gameName}** 서버 종료 중 오류 발생: ${error.message}`);
                } else {
                    message.reply(`🛑 **${gameName}** 서버가 강제 종료되었습니다. (PID: ${serverPID})`);
                    delete runningServers[gameName];
                }
            });
        } else {
            // 🔥 **CMD 창에 명령어 입력**
            const serverProcess = spawn('cmd.exe', ['/c', `echo ${stopCommand} | taskkill /PID ${serverPID} /F`], { 
                shell: true 
            });

            serverProcess.on('close', () => {
                message.reply(`🛑 **${gameName}** 서버가 정상적으로 종료되었습니다.`);
                delete runningServers[gameName];
            });
        }
    } catch (error) {
        console.error(`❌ 서버 정지 중 오류 발생: ${error.message}`);
        message.reply(`❌ **${gameName}** 서버 정지 중 오류가 발생했습니다.`);
    }
}

// 📁 **프로세스 PID 가져오기**
function getProcessPID(processName) {
    return new Promise((resolve, reject) => {
        exec(`tasklist /FI "IMAGENAME eq ${processName}"`, (error, stdout) => {
            if (error) {
                console.error('❌ tasklist 명령 실행 중 오류 발생:', error);
                return resolve(null);
            }
            const match = stdout.match(/\d+/);
            const pid = match ? parseInt(match[0], 10) : null;
            resolve(pid);
        });
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
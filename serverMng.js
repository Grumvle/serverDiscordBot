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

// 📁 서버 시작 기능
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
    if (!fs.existsSync(serverPath.replace(/"/g, ''))) {
        message.reply(`❌ **${serverPath}** 파일을 찾을 수 없습니다.`);
        return;
    }

    try {
        const serverProcess = spawn(serverPath, [], {
            shell: true,
            detached: true, // 프로세스를 부모 프로세스로부터 분리
            stdio: 'ignore' // 로그 출력을 무시
        });

        serverProcess.unref(); // 부모 프로세스와의 연결을 끊음
        runningServers[gameName] = serverProcess.pid; // 실행 중인 서버의 PID 저장

        serverProcess.on('error', (error) => {
            console.error(`❌ 서버 실행 중 오류 발생: ${error.message}`);
            message.reply(`❌ **${gameName}** 서버 시작 중 오류가 발생했습니다.`);
        });

        message.reply(`🚀 **${gameName}** 서버가 시작되었습니다. (PID: ${serverProcess.pid})`);
    } catch (error) {
        console.error(`❌ 서버 시작 중 오류 발생: ${error.message}`);
        message.reply(`❌ **${gameName}** 서버 시작 중 오류가 발생했습니다.`);
    }
}

// 📁 서버 시작 기능
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
        runningServers[gameName] = serverProcess.pid; // 실행 중인 서버의 PID 저장

        serverProcess.on('error', (error) => {
            console.error(`❌ 서버 실행 중 오류 발생: ${error.message}`);
            message.reply(`❌ **${gameName}** 서버 시작 중 오류가 발생했습니다.`);
        });

        message.reply(`🚀 **${gameName}** 서버가 시작되었습니다. (PID: ${serverProcess.pid})`);
    } catch (error) {
        console.error(`❌ 서버 시작 중 오류 발생: ${error.message}`);
        message.reply(`❌ **${gameName}** 서버 시작 중 오류가 발생했습니다.`);
    }
}

// 📁 서버 정지 기능
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
    const serverPath = servers[gameName].path;
    const serverPID = runningServers[gameName];

    if (!serverPID) {
        message.reply(`❌ **${gameName}** 서버는 실행 중이지 않습니다.`);
        return;
    }

    try {
        if (stopCommand.toLowerCase() === 'kill') {
            // 🔥 **PID 기반 강제 종료**
            process.kill(serverPID, 'SIGTERM');
            message.reply(`🛑 **${gameName}** 서버가 강제 종료되었습니다. (PID: ${serverPID})`);
            delete runningServers[gameName];

        } else {
            // 🔥 **CMD 창에 명령어 입력**
            const serverProcess = spawn('cmd.exe', ['/c', `echo ${stopCommand} | ${serverPath}`], { 
                shell: true 
            });

            serverProcess.stdout.on('data', (data) => {
                console.log(`[${gameName} 서버]: ${data}`);
            });

            serverProcess.stderr.on('data', (data) => {
                console.error(`[${gameName} 서버 에러]: ${data}`);
            });

            serverProcess.on('close', (code) => {
                console.log(`"${gameName}" 서버 종료 (코드: ${code})`);
                message.reply(`🛑 **${gameName}** 서버가 정상적으로 종료되었습니다.`);
                delete runningServers[gameName]; // 실행 중인 서버 목록에서 제거
            });

            message.reply(`🛑 **${gameName}** 서버 종료 명령어 실행: ${stopCommand}`);
        }
    } catch (error) {
        console.error(`❌ 서버 정지 중 오류 발생: ${error.message}`);
        message.reply(`❌ **${gameName}** 서버 정지 중 오류가 발생했습니다.`);
    }
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
import fs from 'fs';
import { spawn } from 'child_process';
import 'dotenv/config';
import { botCommand, serverCommands, ladderCommands, teamCommands, drawCommands } from './botCommands.js';
const filePath = process.env.filePath

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
// 봇 상태 업데이트
export function updateBotStatus(client) {
    const running = Object.keys(runningServers);
    if (running.length > 0) {
        client.user.setActivity(`${running[0]} 실행 중 | $명령어`, { type: ActivityType.Playing });
    } else {
        client.user.setActivity('$명령어', { type: ActivityType.Playing });
    }
}

// 명령어 목록 출력
export function handleCommands(message) {
    // 📚 **서버 관리 명령어**
    let response = '**📚 서버 관리 명령어**\n';
    for (const [key, value] of Object.entries(serverCommands)) {
        response += `**${key}**\n  ${value}\n`;
    }

    // 🎉 **사다리타기 명령어**
    response += '\n**🎉 사다리타기 명령어**\n';
    for (const [key, value] of Object.entries(ladderCommands)) {
        response += `**${key}**\n  ${value}\n`;
    }

    // 🤝 **팀 나누기 명령어**
    response += '\n**🤝 팀 나누기 명령어**\n';
    for (const [key, value] of Object.entries(teamCommands)) {
        response += `**${key}**\n  ${value}\n`;
    }

    // 🎉 **제비뽑기 명령어**
    response += '\n**🎉 제비뽑기 명령어**\n';
    for (const [key, value] of Object.entries(drawCommands)) {
        response += `**${key}**\n  ${value}\n`;
    }

    // 📘 **기타 명령어**
    response += '\n**📘 기타 명령어**\n';
    response += `**$명령어**\n  사용 가능한 모든 명령어를 확인합니다.\n`;

    // Discord 메시지 길이 제한 (2000자) 확인
    if (response.length > 2000) {
        const messageChunks = splitMessage(response);
        messageChunks.forEach(chunk => message.reply(chunk));
    } else {
        message.reply(response);
    }
}

/**
 * 긴 메시지를 Discord의 최대 길이(2000자)로 나누는 함수
 * @param {string} message - 전체 메시지
 * @returns {Array<string>} - 잘린 메시지의 배열
 */
function splitMessage(message) {
    const maxLength = 2000; // Discord의 메시지 최대 길이
    const chunks = [];
    for (let i = 0; i < message.length; i += maxLength) {
        chunks.push(message.slice(i, i + maxLength));
    }
    return chunks;
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

    if (!gameName || !serverPath || !detail || !stopCommand) {
        message.reply('❌ 사용법: `$서버추가 [게임 이름] [서버 경로] [설명] [종료 명령어]`\n예: `$서버추가 "pzserver" "D:\\Dedicated Servers\\Project Zomboid Dedicated Server\\StartServer64.bat" "프로젝트 좀보이드 서버" quit`');
        return;
    }

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
    // 1️⃣ 정규식을 사용하여 게임 이름 추출
    const input = message.content.match(/"([^"]+)"|(\S+)/g);

    // 명령어 예: $서버제거 "좀보이드"
    if (!input || input.length < 2) {
        message.reply('❌ 사용법: `$서버제거 [게임 이름]`\n예: `$서버제거 "좀보이드"`');
        return;
    }

    // 2️⃣ 게임 이름 추출 (명령어 뒤의 첫 번째 인수)
    const gameName = input[1].replace(/"/g, '').trim();

    if (!gameName) {
        message.reply('❌ 사용법: `$서버제거 [게임 이름]`\n예: `$서버제거 "좀보이드"`');
        return;
    }

    const servers = loadServers();

    // 3️⃣ 서버가 존재하지 않을 때의 에러 처리
    if (!servers[gameName]) {
        message.reply(`❌ **${gameName}** 서버를 찾을 수 없습니다.`);
        return;
    }

    // 4️⃣ 서버 삭제
    delete servers[gameName];

    // 5️⃣ 서버 정보 저장
    saveServers(servers);
    message.reply(`🗑️ **${gameName}** 서버가 목록에서 제거되었습니다.`);
}

// 서버 목록 출력
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
    const input = message.content.split(' ');
    const gameName = input[1]?.trim();

    if (!gameName) {
        message.reply('❌ 사용법: `$서버시작 [게임 이름]`\n예: `$서버시작 "pzserver"`');
        return;
    }

    const servers = loadServers();
    if (!servers[gameName]) {
        message.reply(`❌ **${gameName}** 서버를 찾을 수 없습니다.`);
        return;
    }

    const serverInfo = servers[gameName];
    let { path: serverPath } = serverInfo;

    if (!serverPath) {
        message.reply(`❌ **${gameName}** 서버의 경로가 설정되지 않았습니다.`);
        return;
    }

    serverPath = validateServerPath(serverPath);

    if (!fs.existsSync(serverPath.replace(/"/g, ''))) {
        message.reply(`❌ **${serverPath}** 파일을 찾을 수 없습니다.`);
        return;
    }

    try {
        const serverProcess = spawn(serverPath, { shell: true });

        // 🟢 서버 프로세스를 전역 변수에 저장
        runningServers[gameName] = serverProcess; 

        serverProcess.stdout.on('data', (data) => {
            console.log(`[${gameName} 서버]: ${data}`);
        });

        serverProcess.stderr.on('data', (data) => {
            console.error(`[${gameName} 서버 에러]: ${data}`);
        });

        serverProcess.on('close', (code) => {
            console.log(`"${gameName}" 서버 종료 (코드: ${code})`);
            delete runningServers[gameName]; // 종료되면 프로세스를 삭제
        });

        serverProcess.on('error', (error) => {
            console.error(`❌ 서버 프로세스 오류 발생: ${error.message}`);
        });

        message.reply(`🚀 **${gameName}** 서버를 실행했습니다.`);
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

    const serverProcess = runningServers[gameName];
    if (!serverProcess) {
        message.reply(`❌ **${gameName}** 서버는 실행 중이지 않습니다.`);
        return;
    }

    const stopCommand = servers[gameName].stopCommand;

    if (!stopCommand) {
        message.reply(`❌ **${gameName}** 서버의 종료 명령어가 설정되지 않았습니다.`);
        return;
    }

    try {
        if (serverProcess.stdin.writable && !serverProcess.stdin.writableEnded) {
            serverProcess.stdin.write(`${stopCommand}\n`);
            console.log(`🛑 서버 ${gameName}에 종료 명령어 입력됨: ${stopCommand}`);
        } else {
            console.log(`❌ 서버 ${gameName}의 stdin이 이미 종료되었습니다.`);
        }

        message.reply(`🛑 **${gameName}** 서버 종료 명령어 실행: ${stopCommand}`);

        serverProcess.on('close', (code) => {
            console.log(`"${gameName}" 서버 종료 (코드: ${code})`);
            delete runningServers[gameName]; // 종료되면 프로세스를 삭제
        });

        serverProcess.on('error', (error) => {
            console.error(`❌ 서버 프로세스 오류 발생: ${error.message}`);
        });
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

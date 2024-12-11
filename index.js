const fs = require('fs');
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const { spawn } = require('child_process');
require('dotenv').config();

// JSON 파일 경로
const filePath = './servers.json';

//Server JSON파일 검증 및 생성
function createFileIfNotExists(path, initialData = {}) {
    try {
        if (!fs.existsSync(path)) {
            fs.writeFileSync(path, JSON.stringify(initialData, null, 4), 'utf8');
            console.log(`${path} 파일이 생성되었습니다.`);
        }
    } catch (error) {
        console.error(`파일 생성 중 오류 발생: ${error.message}`);
    }
}

// 실행 중인 서버를 관리할 객체
const runningServers = {};

// 봇 명령어 및 설명
const botCommand = {
    '$서버목록': '서버 목록을 확인 합니다.',
    '$서버추가': '서버를 추가합니다.\n 사용법: $서버추가 [게임 이름] [서버 실행 파일 경로] [서버 종료 명령어]',
    '$서버제거': '서버를 제거합니다.\n 사용법: $서버제거 [게임 이름]',
    '$서버시작': '선택한 서버를 시작합니다.\n 사용법: $서버시작 [게임 이름]',
    '$서버정지': '선택한 서버를 정지합니다.\n 사용법: $서버정지 [게임 이름]',
    '$실행서버': '현재 실행 중인 서버 목록을 확인합니다.',
};

// 서버 정보 로드
function loadServers() {
    if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    return {};
}

// 서버 정보 저장
function saveServers(servers) {
    fs.writeFileSync(filePath, JSON.stringify(servers, null, 4), 'utf8');
}

// 봇 상태 업데이트
function updateBotStatus(client) {
    const running = Object.keys(runningServers);
    if (running.length > 0) {
        client.user.setActivity(`${running[0]} 실행 중 | $명령어`, { type: ActivityType.Playing });
    } else {
        client.user.setActivity('$명령어', { type: ActivityType.Playing });
    }
}

// 명령어 목록 출력
function handleCommands(message) {
    let count = 0;
    let response = '**사용 가능한 명령어 목록:**\n';
    for (const [key, value] of Object.entries(botCommand)) {
        count++;
        response += `${count}. ${key}: ${value}\n`;
    }
    message.reply(response);
}

// 서버 추가
function handleAddServer(message, args) {
    const [gameName, serverPath, stopCommand] = args;
    if (!gameName || !serverPath || !stopCommand) {
        message.reply(botCommand['$서버추가']);
        return;
    }

    const servers = loadServers();
    if (servers[gameName]) {
        message.reply(`서버 "${gameName}"는 이미 존재합니다.`);
        return;
    }

    servers[gameName] = { path: serverPath, stopCommand };
    saveServers(servers);
    message.reply(`서버 "${gameName}" 추가 완료.`);
}

// 서버 목록 출력
function handleListServers(message) {
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

// 특정 서버 실행
function handleStartServer(client, message, args) {
    const [gameName] = args;
    if (!gameName) {
        message.reply(botCommand['$서버시작']);
        return;
    }

    const servers = loadServers();
    const serverInfo = servers[gameName];
    if (!serverInfo) {
        message.reply(`"${gameName}" 서버를 찾을 수 없습니다.`);
        return;
    }

    if (runningServers[gameName]) {
        message.reply(`"${gameName}" 서버는 이미 실행 중입니다.`);
        return;
    }

    const { path } = serverInfo;
    const serverProcess = spawn(path, { shell: true });

    runningServers[gameName] = serverProcess; // 실행 중인 서버 등록

    serverProcess.stdout.on('data', (data) => {
        console.log(`[${gameName} 서버]: ${data}`);
    });

    serverProcess.stderr.on('data', (data) => {
        console.error(`[${gameName} 서버 에러]: ${data}`);
    });

    serverProcess.on('close', (code) => {
        console.log(`"${gameName}" 서버 종료 (코드: ${code})`);
        delete runningServers[gameName]; // 실행 중인 서버에서 제거
        updateBotStatus(client); // 봇 상태 업데이트
    });

    message.reply(`"${gameName}" 서버를 실행했습니다.`);
    updateBotStatus(client); // 봇 상태 업데이트
}

// 서버 정지
function handleStopServer(client, message, args) {
    const [gameName] = args;

    if (!gameName) {
        message.reply('사용법: $서버정지 [게임 이름]');
        return;
    }

    const servers = loadServers();
    const serverInfo = servers[gameName];
    if (!serverInfo) {
        message.reply(`"${gameName}" 서버를 찾을 수 없습니다.`);
        return;
    }

    const serverProcess = runningServers[gameName];
    if (!serverProcess) {
        message.reply(`"${gameName}" 서버는 실행 중이지 않습니다.`);
        return;
    }

    const { stopCommand } = serverInfo;

    serverProcess.stdin.write(`${stopCommand}\n`);
    serverProcess.stdin.end(); // 입력 스트림 종료
    delete runningServers[gameName]; // 실행 중인 서버에서 제거
    message.reply(`"${gameName}" 서버 종료 명령어를 실행했습니다.`);
    updateBotStatus(client); // 봇 상태 업데이트
}

// 실행 중인 서버 목록 확인
function handleRunningServers(message) {
    const running = Object.keys(runningServers);
    if (running.length === 0) {
        message.reply('현재 실행 중인 서버가 없습니다.');
    } else {
        message.reply(`실행 중인 서버 목록:\n- ${running.join('\n- ')}`);
    }
}

// 디스코드 클라이언트 생성
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    createFileIfNotExists(filePath, {});
    updateBotStatus(client); // 봇 상태 초기화
});

client.on('messageCreate', (message) => {
    if (message.author.bot) return;

    // $로 시작하는 명령어만 인식
    if (!message.content.startsWith('$')) return;

    const [command, ...args] = message.content.split(' ');

    switch (command) {
        case '$명령어':
            handleCommands(message);
            break;

        case '$서버추가':
            handleAddServer(message, args);
            break;

        case '$서버목록':
            handleListServers(message);
            break;

        case '$서버시작':
            handleStartServer(client, message, args);
            break;

        case '$서버정지':
            handleStopServer(client, message, args);
            break;

        case '$실행서버':
            handleRunningServers(message);
            break;

        default:
            message.reply('알 수 없는 명령어입니다. $명령어를 입력해 사용 가능한 명령어를 확인하세요.');
    }
});

client.login(process.env.DISCORD_TOKEN);

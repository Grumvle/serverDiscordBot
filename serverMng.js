import fs from 'fs';
import { spawn, exec } from 'child_process';
import 'dotenv/config';
import iconv from 'iconv-lite';

const filePath = process.env.filePath;
const steamPath = process.env.steamPath;

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
        message.reply('❌ 사용법: `$서버추가 [게임 이름] [서버 경로] [게임 ID] [설명] [종료 명령어]`\n예: `$서버추가 "pzserver" "D:\\Dedicated Servers\\Project Zomboid Dedicated Server\\StartServer64.bat" "108600" "프로젝트 좀보이드 서버" quit`');
        return;
    }

    const gameName = input[1].replace(/"/g, '').trim();
    const serverPath = validateServerPath(input[2].replace(/"/g, '').trim());
    const gameId = input[3].replace(/"/g, '').trim();
    const detail = input[4].replace(/"/g, '').trim();
    const stopCommand = input[5].replace(/"/g, '').trim();

    const servers = loadServers();
    if (servers[gameName]) {
        message.reply(`❌ **${gameName}** 서버는 이미 존재합니다.`);
        return;
    }

    servers[gameName] = {
        path: serverPath,
        gameId: gameId,
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


// 📁 서버 시작 기능
process.on('uncaughtException', (error) => {
    console.error('❌ 예기치 못한 오류 발생:', error);
});

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
    
    // 서버 시작
    message.reply(`🚀 **${gameName}** 서버 시작 중...`);

    const process = spawn('python', ['start_server.py', serverPath]);

    process.stdout.on('data', (data) => {
        console.log(`📘 파이썬 스크립트 stdout: ${data}`);
    });

    process.stderr.on('data', (data) => {
        console.error(`📘 파이썬 스크립트 stderr: ${data}`);
    });

    process.on('close', (code) => {
        if (code === 0) {
            message.reply(`✅ **${gameName}** 서버가 성공적으로 시작되었습니다.`);
        } else {
            message.reply(`❌ **${gameName}** 서버 시작 중 오류가 발생했습니다. (종료 코드: ${code})`);
        }
    });
}

//서버 업데이트
export function handleUpdateServers(client, message, args) {
    const input = message.content.match(/"([^"]+)"|(\S+)/g);
    if (!input || input.length < 2) {
        message.reply('❌ 사용법: `$서버업데이트 [게임 이름]`\n예: `$서버업데이트 "pzserver"`');
        return;
    }

    const gameName = input[1].replace(/"/g, '').trim();
    const servers = loadServers();

    if (!servers[gameName]) {
        message.reply(`❌ **${gameName}** 서버를 찾을 수 없습니다.`);
        return;
    }

    const serverPath = servers[gameName].path;
    const gameId = servers[gameName].gameId;

    // 서버 업데이트
    message.reply(`🚀 **${gameName}** 서버 업데이트 중...`);

    const process = spawn('python', ['update_server.py', serverPath, gameId, steamPath]);

    process.stdout.on('data', (data) => {
        console.log(`📘 파이썬 스크립트 stdout: ${data}`);
    });

    process.stderr.on('data', (data) => {
        console.error(`📘 파이썬 스크립트 stderr: ${data}`);
    });
    process.on('close', (code) => {
        if (code === 0) {
            message.reply(`✅ **${gameName}** 서버 업데이트가 완료되었습니다.`);
        } else {
            message.reply(`❌ **${gameName}** 서버 업데이트 중 오류가 발생했습니다. (종료 코드: ${code})`);
        }
    });

}


// 📁 **프로세스 이름 추출 함수**
function getExecutableFileNameFromPath(path) {
    const parts = path.split('\\');
    const fileName = parts[parts.length - 1].split('.')[0];
    return fileName.replace(/"/g, ''); // " 제거
}

/**
 * 주어진 프로세스 이름을 사용해 모든 PID를 가져옵니다.
 * @param {string} processName 종료할 프로세스 이름
 * @returns {Promise<number[]>} 모든 PID 목록
 */
export function getProcessPID(processName) {
    return new Promise((resolve, reject) => {
        const command = `wmic process where "name like'%${processName}%'" get ProcessId`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ wmic 명령어 실행 중 오류 발생: ${stderr || error.message}`);
                return reject(error);
            }

            const pids = stdout.split('\n')
                .filter(line => line.trim() && !isNaN(line.trim()))
                .map(pid => parseInt(pid.trim()));

            if (pids.length > 0) {
                console.log(`📘 프로세스 ${processName}의 PID 목록: ${pids}`);
                resolve(pids); // 모든 PID 반환
            } else {
                reject(new Error(`프로세스 ${processName}의 PID를 찾을 수 없습니다.`));
            }
        });
    });
}

/**
 * PID를 사용하여 프로세스를 종료합니다.
 * @param {number} pid 종료할 프로세스의 PID
 * @returns {Promise<void>}
 */
export function killProcessByPID(pid) {
    return new Promise((resolve, reject) => {
        const command = `taskkill /PID ${pid} /F`;
        console.log(`🛠️ 실행 명령어: ${command}`);

        exec(command, { encoding: 'buffer' }, (error, stdout, stderr) => {
            if (error) {
                const errorMsg = iconv.decode(stderr, 'cp949'); // CP949에서 UTF-8로 변환
                console.error(`❌ taskkill 실행 오류: ${errorMsg}`);
                return reject(new Error(errorMsg));
            }

            const successMsg = iconv.decode(stdout, 'cp949'); // CP949에서 UTF-8로 변환
            console.log(`✅ taskkill 실행 성공: ${successMsg}`);
            resolve();
        });
    });
}

export function killProcessesByPID(pids) {
    return Promise.all(
        pids.map(pid => killProcessByPID(pid)) // 모든 PID에 대해 killProcessByPID 호출
    );
}

// 📁 **서버 종료 기능**
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

    const { stopCommand, path } = servers[gameName];

    if (stopCommand === 'kill') {
        const processName = getExecutableFileNameFromPath(path);
        getProcessPID(processName)
            .then(pids => {
                if (pids.length === 0) {
                    throw new Error(`PID를 찾을 수 없습니다: ${processName}`);
                }
        
                console.log(`📘 종료할 PID 목록: ${pids}`);
                return killProcessesByPID(pids); // 모든 PID 종료
            })
            .then(() => {
                delete runningServers[gameName]; // 종료 성공 후에 실행
                message.reply(`🛑 **${gameName}** 서버의 프로세스를 종료했습니다.`);
            })
            .catch(error => {
                console.error(`❌ PID 가져오기 중 오류 발생: ${error.message}`);
                message.reply(`❌ **${gameName}** 서버의 PID를 찾을 수 없습니다.`);
            });
    }
    // 🔥 **quit 명령어로 종료해야 하는 경우 (파이썬 호출)**
    else {
        const windowTitle = 'StartServer64.bat';
        message.reply(`🛑 **${gameName}** 서버에 quit 명령어 전송 중...`);

        exec(`python quit_and_close.py "${windowTitle}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ 파이썬 스크립트 실행 중 오류 발생: ${error.message}`);
                message.reply(`❌ **${gameName}** 서버 종료 중 오류가 발생했습니다.`);
                return;
            }
            console.log(`📘 파이썬 스크립트 stdout: ${stdout}`);
            console.error(`📘 파이썬 스크립트 stderr: ${stderr}`);
            message.reply(`✅ **${gameName}** 서버 종료 명령어가 성공적으로 전송되었습니다.`);
        });
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
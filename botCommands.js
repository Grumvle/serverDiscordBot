// 서버 명령어 목록
export const serverCommands = {
    '$서버목록': '등록된 서버 목록을 확인합니다.',
    '$서버추가': '서버를 추가합니다.\n사용법: $서버추가 [게임 이름] [서버 경로] [설명] [종료 명령어]\n예: $서버추가 "좀보이드" "D:\\Dedicated Servers\\Project Zomboid Dedicated Server\\StartServer64.bat" "프로젝트 좀보이드 서버" quit',
    '$서버제거': '등록된 서버를 제거합니다.\n사용법: $서버제거 [게임 이름]\n예: $서버제거 "좀보이드"',
    '$서버시작': '선택한 서버를 시작합니다.\n사용법: $서버시작 [게임 이름]\n예: $서버시작 "좀보이드"',
    '$서버종료': '선택한 서버를 종료합니다.\n사용법: $서버종료 [게임 이름]\n예: $서버종료 "좀보이드"',
    '$실행서버': '현재 실행 중인 서버 목록을 확인합니다.',
};

// 사다리 명령어 목록
export const ladderCommands = {
    '$사다리 음성채널': '음성 채널에 참가자를 추가합니다.\n사용법: $사다리 음성채널 [채널 ID 또는 채널 이름]',
    '$사다리 설정': '참가자를 직접 설정합니다.\n사용법: $사다리 설정 [이름1] [이름2] [이름3]',
    '$사다리 결과': '사다리 결과를 설정합니다.\n사용법: $사다리 결과 [결과1] [결과2] [결과3]',
    '$사다리 시작': '사다리타기를 시작합니다.',
};

// 팀 나누기 명령어 목록
export const teamCommands = {
    '$팀나누기 음성채널': '음성 채널의 참가자를 랜덤으로 팀으로 나눕니다.\n사용법: $팀나누기 음성채널 [채널 이름 또는 채널 ID] [팀 수]',
    '$팀나누기 사용자': '직접 입력한 참가자를 랜덤으로 팀으로 나눕니다.\n사용법: $팀나누기 사용자 [참가자1] [참가자2] ... [팀 수]',
};

// 제비뽑기 명령어 목록
export const drawCommands = {
    '$제비뽑기 음성채널': '음성 채널에 참가자를 추가하여 제비뽑기를 합니다.\n사용법: $제비뽑기 음성채널 [채널 이름 또는 채널 ID] [당첨 인원 수]',
    '$제비뽑기 사용자': '참가자를 직접 추가하여 제비뽑기를 합니다.\n사용법: $제비뽑기 사용자 [참가자1] [참가자2] ... [당첨 인원 수]',
};

// 모든 명령어를 통합한 목록
export const botCommand = {
    ...serverCommands,
    ...ladderCommands,
    ...teamCommands,
    ...drawCommands,
    '$명령어': '사용 가능한 모든 명령어를 확인합니다.',
};

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
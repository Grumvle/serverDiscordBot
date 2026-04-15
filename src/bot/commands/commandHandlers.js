/**
 * 게임 유틸리티 명령어 핸들러 모듈
 * 제비뽑기, 팀 나누기, 사다리타기 등의 기능을 처리
 */

import { getVoiceChannelMembersByNickname } from '../../utils/utils.js';
import { runDraw } from '../games/draw.js';
import { divideIntoTeams, sendTeamEmbed } from '../games/teamSplit.js';
import {
    setParticipants,
    setResults,
    runLadder,
    setParticipantsFromVoiceChannel,
} from '../games/ladder.js';

export async function handleVoiceChannelCommand(client, message, args, handler, usageName) {
    try {
        if (args.length < 2) {
            message.reply(`사용법: ${usageName} [채널 이름] [개수]`);
            return;
        }

        const channelName = args.slice(0, -1).join(' ').trim();
        const count = parseInt(args[args.length - 1], 10);

        if (!channelName || isNaN(count) || count <= 0) {
            message.reply(`사용법: ${usageName} [채널 이름] [개수]\n개수는 1 이상의 숫자여야 합니다.`);
            return;
        }

        const participants = await getVoiceChannelMembersByNickname(client, channelName);

        if (participants.length === 0) {
            message.reply(`"${channelName}" 채널에 참가자가 없습니다. 채널 이름이 정확한지 확인해주세요.`);
            return;
        }

        if (participants.length < count) {
            message.reply(`참가자 수(${participants.length})가 요청한 개수(${count})보다 적습니다.`);
            return;
        }

        await handler(message, participants, count);
    } catch (error) {
        console.error('음성 채널 명령 처리 오류:', error);
        message.reply(`명령 처리 중 오류가 발생했습니다: ${error.message}`);
    }
}

export async function handleUserListCommand(message, args, handler, usageName) {
    try {
        if (args.length < 2) {
            message.reply(`사용법: ${usageName} [참가자1] [참가자2] ... [개수]`);
            return;
        }

        const participants = args.slice(0, -1);
        const count = parseInt(args[args.length - 1], 10);

        if (participants.length === 0 || isNaN(count) || count <= 0) {
            message.reply(`사용법: ${usageName} [참가자1] [참가자2] ... [개수]\n개수는 1 이상의 숫자여야 합니다.`);
            return;
        }

        if (participants.length < count) {
            message.reply(`참가자 수(${participants.length})가 요청한 개수(${count})보다 적습니다.`);
            return;
        }

        await handler(message, participants, count);
    } catch (error) {
        console.error('사용자 목록 명령 처리 오류:', error);
        message.reply(`명령 처리 중 오류가 발생했습니다: ${error.message}`);
    }
}

export async function handleDrawCommand(message, participants, drawCount) {
    const winners = runDraw(participants, drawCount);
    message.reply(`🎉 제비뽑기 당첨자: ${winners.join(', ')}`);
}

export async function handleTeamSplitCommand(message, participants, teamCount) {
    const teams = divideIntoTeams(participants, teamCount);
    sendTeamEmbed(message, teams);
}

export async function handleLadderSubcommands(client, message, option, args) {
    switch (option) {
        case '음성채널':
            if (!args.length) {
                message.reply('사용법: $사다리 음성채널 [채널 이름 또는 채널 ID]');
                return;
            }

            const channelName = args.join(' ').trim();
            const members = await getVoiceChannelMembersByNickname(client, channelName);

            if (members.length === 0) {
                message.reply(`"${channelName}" 채널에 참가자가 없습니다. 채널 이름이 정확한지 확인하세요.`);
            } else {
                setParticipantsFromVoiceChannel(members);
                message.reply(`참가자가 설정되었습니다:\n- ${members.join('\n- ')}\n결과를 추가하려면 $사다리 결과 [결과1] [결과2] ... 명령어를 사용하세요.`);
            }
            break;

        case '설정':
            if (args.length === 0) {
                message.reply('사용법: $사다리 설정 [이름1] [이름2] [이름3]');
                return;
            }
            setParticipants(args);
            message.reply(`참가자가 설정되었습니다:\n- ${args.join('\n- ')}\n결과를 추가하려면 $사다리 결과 [결과1] [결과2] ... 명령어를 사용하세요.`);
            break;

        case '결과':
            if (args.length === 0) {
                message.reply('사용법: $사다리 결과 [결과1] [결과2] [결과3]');
                return;
            }
            setResults(args);
            message.reply(`결과가 설정되었습니다:\n- ${args.join('\n- ')}\n사다리타기를 시작하려면 $사다리 시작을 입력하세요.`);
            break;

        case '시작':
            try {
                const ladderResults = runLadder();
                const resultMessage = ladderResults.map(item => `${item.participant}: ${item.result}`).join('\n');
                message.reply(`사다리타기 결과:\n${resultMessage}`);
            } catch (error) {
                message.reply(error.message);
            }
            break;

        default:
            message.reply('알 수 없는 옵션입니다. $사다리 음성채널, $사다리 설정, $사다리 결과, $사다리 시작 중 하나를 입력하세요.');
            break;
    }
}
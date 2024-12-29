import { botCommand, handleCommands } from './botCommands.js'; 
import {
    handleAddServer,
    handleStartServer,
    handleStopServer,
    handleRunningServers,
    handleRemoveServer,
} from './serverMng.js'; 
import {
    setParticipants,
    setResults,
    runLadder,
    setParticipantsFromVoiceChannel,
} from './ladder.js'; 
import { 
    divideIntoTeams, 
    sendTeamEmbed 
} from './teamSplit.js'; 
import { runDraw } from './draw.js';
import { getVoiceChannelMembersByNickname } from './utils.js';
import { Client, GatewayIntentBits } from 'discord.js';
import 'dotenv/config';

//전역 설정
let participants;
let drawCount;

// 디스코드 클라이언트 생성
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
    ],
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('$')) return;

    const [command, option, ...args] = message.content.split(' ');

    switch (command) {
        case '$명령어':
            handleCommands(message, botCommand);
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

        case '$서버종료':
            handleStopServer(client, message, args);
            break;
        
        case '$서버제거':
            handleRemoveServer(message, args);
            break;

        case '$실행서버':
            handleRunningServers(message);
            break;

        // 사다리 관련 명령어
        case '$사다리':
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
            break;

        case '$팀나누기':
            switch(option) {
                case '음성채널':
                    let channelName = args.slice(0, -1).join(' ').trim();
                    let teamCount = parseInt(args[args.length - 1], 10);
    
                    if (!channelName || isNaN(teamCount)) {
                        message.reply('사용법: $팀나누기 음성채널 [채널 이름] [팀 수]');
                        return;
                    }
    
                    participants = await getVoiceChannelMembersByNickname(client, channelName);
                    if (participants.length === 0) {
                        message.reply(`"${channelName}" 채널에 참가자가 없습니다.`);
                        return;
                    }
    
                    try {
                        const teams = divideIntoTeams(participants, teamCount);
                        sendTeamEmbed(message, teams);
                    } catch (error) {
                        message.reply(error.message);
                    }
                    break;
                case '사용자':
                    participants = args.slice(0, -1);
                    teamCount = parseInt(args[args.length - 1], 10);
    
                    if (participants.length === 0 || isNaN(teamCount)) {
                        message.reply('사용법: $팀나누기 사용자 [참가자1] [참가자2] ... [팀 수]');
                        return;
                    }
    
                    try {
                        const teams = divideIntoTeams(participants, teamCount);
                        sendTeamEmbed(message, teams);
                    } catch (error) {
                        message.reply(error.message);
                    }
                    break;
                default:
                    message.reply('알 수 없는 옵션입니다. $팀나누기 음성채널, $팀나누기 사용자');
                    break;
            }
            break;
        case '$제비뽑기':
            switch(option) {
                case '음성채널':
                    const channelName = args.slice(0, -1).join(' ').trim();
                    participants = await getVoiceChannelMembersByNickname(client, channelName);
                    drawCount = parseInt(args[args.length - 1], 10);

                    if (participants.length === 0) {
                        message.reply(`"${channelName}" 채널에 참가자가 없거나 명령어가 잘못되었습니다.`);
                        return;
                    }
                    
                    try {
                        const winners = runDraw(participants, drawCount);
                        message.reply(`🎉 제비뽑기 당첨자: ${winners.join(', ')}`);
                    } catch (error) {
                        message.reply(error.message);
                    }
                    break;
                case '사용자':
                    participants = args.slice(0, -1);
                    drawCount = parseInt(args[args.length - 1], 10);

                    if (participants.length === 0 || isNaN(drawCount)) {
                        message.reply('사용법: $제비뽑기 사용자 [참가자1] [참가자2] ... [당첨 인원 수]');
                        return;
                    }

                    try {
                        const winners = runDraw(participants, drawCount);
                        message.reply(`🎉 제비뽑기 당첨자: ${winners.join(', ')}`);
                    } catch (error) {
                        message.reply(error.message);
                    }
                    break;
                default:
                    message.reply('알 수 없는 옵션입니다. $제비뽑기 음성채널, $제비뽑기 사용자');
                    break;
            }
            break;

        default:
            message.reply('알 수 없는 명령어입니다. $명령어를 입력해 사용 가능한 명령어를 확인하세요.');
    }
});

client.login(process.env.DISCORD_TOKEN);
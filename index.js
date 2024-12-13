import { botCommand } from './botCommands'; // 명령어 가져오기
import {
    handleCommands,
    handleAddServer,
    handleListServers,
    handleStartServer,
    handleStopServer,
    handleRunningServers,
} from './gameServerFunc'; // 서버 관련 기능
import {
    setParticipants,
    setResults,
    runLadder,
    setParticipantsFromVoiceChannel,
} from './ladder'; // 사다리 관련 기능
import { Client, GatewayIntentBits } from 'discord.js';
require('dotenv').config();

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

/**
 * 음성 채널 멤버 가져오기
 * @param {string} channelId - 음성 채널 ID
 * @returns {Promise<Array<string>>} - 음성 채널 멤버 이름 배열
 */
async function getVoiceChannelMembers(channelId) {
    const channel = await client.channels.fetch(channelId);
    if (!channel || channel.type !== 2) {
        return [];
    }
    return channel.members.map(member => member.user.username);
}

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('$')) return;

    const [command, option, ...args] = message.content.split(' ');

    switch (command) {
        // 서버 관련 명령어
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

        case '$서버정지':
            handleStopServer(client, message, args);
            break;

        case '$실행서버':
            handleRunningServers(message);
            break;

        // 사다리 관련 명령어
        case '$사다리':
            switch (option) {
                case '음성채널':
                    if (!args[0]) {
                        message.reply('사용법: $사다리 음성채널 [채널 ID]');
                        return;
                    }
                    const members = await getVoiceChannelMembers(args[0]);
                    if (members.length === 0) {
                        message.reply('음성 채널에 참가자가 없습니다.');
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

        default:
            message.reply('알 수 없는 명령어입니다. $명령어를 입력해 사용 가능한 명령어를 확인하세요.');
    }
});

client.login(process.env.DISCORD_TOKEN);
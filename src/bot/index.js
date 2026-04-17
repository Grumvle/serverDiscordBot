/**
 * Discord 봇 메인 애플리케이션
 * 서버 관리, 게임 유틸리티, 음성 채널 연동 등의 기능을 제공
 * 슬래시 명령어와 기존 텍스트 명령어를 모두 지원
 */

import { Client, GatewayIntentBits, MessageFlags } from 'discord.js';
import { botCommand, handleCommands } from './core/botCommands.js';
import {
    handleVoiceChannelCommand,
    handleUserListCommand,
    handleDrawCommand,
    handleTeamSplitCommand,
    handleLadderSubcommands
} from './commands/commandHandlers.js';
import { createServerCommandHandlers } from './commands/serverCommandHandlers.js';
import {
    handleDrawSlashCommand,
    handleTeamSplitSlashCommand,
    handleLadderSlashCommand,
    handleServerSlashCommand,
    handleHelpSlashCommand
} from './commands/slashCommandHandlers.js';
import {
    handleSelectMenuInteraction,
    handleButtonInteraction,
    handleModalSubmit
} from './interactions/interactionHandlers.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .env 파일 로드
dotenv.config({ path: join(__dirname, '../config/.env') });

// Discord 클라이언트 초기화 - 필요한 권한들을 설정
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,              // 서버 정보 접근
        GatewayIntentBits.GuildMessages,       // 메시지 읽기
        GatewayIntentBits.GuildMessageReactions, // 이모지 반응 처리
        GatewayIntentBits.MessageContent,      // 메시지 내용 접근
        GatewayIntentBits.GuildVoiceStates,    // 음성 채널 상태 접근
        GatewayIntentBits.GuildMembers,        // 멤버 정보 접근
    ],
});

// 서버 관련 명령어 핸들러들 초기화
const serverHandlers = createServerCommandHandlers();

// 봇이 준비되면 로그 출력
client.once('ready', () => {
    console.log(`✅ ${client.user.tag}으로 로그인되었습니다!`);
    console.log(`📊 ${client.guilds.cache.size}개의 서버에서 활동 중`);
    console.log(`🎯 슬래시 명령어가 활성화되었습니다!`);
});

// 슬래시 명령어 인터랙션 처리
client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.isChatInputCommand()) {
            // 슬래시 명령어 처리
            switch (interaction.commandName) {
                case '제비뽑기':
                    await handleDrawSlashCommand(interaction);
                    break;
                case '팀나누기':
                    await handleTeamSplitSlashCommand(interaction);
                    break;
                case '사다리':
                    await handleLadderSlashCommand(interaction);
                    break;
                case '서버':
                    await handleServerSlashCommand(interaction);
                    break;
                case '도움말':
                    await handleHelpSlashCommand(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: '알 수 없는 명령어입니다.',
                        ephemeral: true
                    });
            }
        }
        else if (interaction.isStringSelectMenu()) {
            // 선택 메뉴 처리
            await handleSelectMenuInteraction(interaction);
        }
        else if (interaction.isButton()) {
            // 버튼 처리
            await handleButtonInteraction(interaction);
        }
        else if (interaction.isModalSubmit()) {
            // 모달 제출 처리
            await handleModalSubmit(interaction);
        }
    } catch (error) {
        console.error('인터랙션 처리 중 오류:', error);

        try {
            const errorMessage = {
                content: '❌ 명령어 처리 중 오류가 발생했습니다.',
                flags: MessageFlags.Ephemeral
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        } catch (replyError) {
            console.error('에러 응답 전송 실패:', replyError);
        }
    }
});

// 메시지 이벤트 리스너 - 기존 텍스트 명령어 처리 (하위 호환성)
client.on('messageCreate', async (message) => {
    // 봇이 보낸 메시지이거나 '$'로 시작하지 않는 메시지는 무시
    if (message.author.bot || !message.content.startsWith('$')) return;

    const [command, option, ...args] = message.content.split(' ');

    // 슬래시 명령어 사용을 권장하는 메시지
    if (command === '$도움말' || command === '$명령어') {
        await message.reply('💡 **새로운 슬래시 명령어를 사용해보세요!**\\n`/도움말`을 입력하면 모든 명령어를 확인할 수 있습니다.\\n\\n기존 명령어도 계속 지원됩니다:');
        handleCommands(message, botCommand);
        return;
    }

    try {
        switch (command) {
            case '$명령어':
                handleCommands(message, botCommand);
                break;

            case '$서버추가':
            case '$서버목록':
            case '$서버제거':
            case '$실행서버':
                serverHandlers[command](message, args);
                break;

            case '$서버시작':
                await serverHandlers[command](client, message);
                break;

            case '$서버종료':
                await serverHandlers[command](client, message);
                break;

            case '$업데이트':
                await serverHandlers[command](client, message);
                break;

            case '$사다리':
                await handleLadderSubcommands(client, message, option, args);
                break;

            case '$팀나누기':
                switch(option) {
                    case '음성채널':
                        await handleVoiceChannelCommand(
                            client,
                            message,
                            args,
                            handleTeamSplitCommand,
                            '$팀나누기 음성채널'
                        );
                        break;
                    case '사용자':
                        await handleUserListCommand(
                            message,
                            args,
                            handleTeamSplitCommand,
                            '$팀나누기 사용자'
                        );
                        break;
                    default:
                        message.reply('💡 **슬래시 명령어를 사용해보세요!**\\n`/팀나누기`를 입력하면 더 쉽게 사용할 수 있습니다.');
                        break;
                }
                break;

            case '$제비뽑기':
                switch(option) {
                    case '음성채널':
                        await handleVoiceChannelCommand(
                            client,
                            message,
                            args,
                            handleDrawCommand,
                            '$제비뽑기 음성채널'
                        );
                        break;
                    case '사용자':
                        await handleUserListCommand(
                            message,
                            args,
                            handleDrawCommand,
                            '$제비뽑기 사용자'
                        );
                        break;
                    default:
                        message.reply('💡 **슬래시 명령어를 사용해보세요!**\\n`/제비뽑기`를 입력하면 더 쉽게 사용할 수 있습니다.');
                        break;
                }
                break;

            default:
                message.reply('알 수 없는 명령어입니다. `/도움말`을 입력해 사용 가능한 명령어를 확인하세요.');
        }
    } catch (error) {
        console.error('Command execution error:', error);
        message.reply('명령어 처리 중 오류가 발생했습니다.');
    }
});

// 에러 핸들링
client.on('error', error => {
    console.error('Discord 클라이언트 오류:', error);
});

process.on('unhandledRejection', error => {
    console.error('처리되지 않은 Promise 거부:', error);
});

client.login(process.env.DISCORD_TOKEN);
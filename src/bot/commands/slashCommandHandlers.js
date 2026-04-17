/**
 * 슬래시 명령어 핸들러 모듈
 * 사용자 친화적인 인터페이스와 ephemeral 응답을 제공
 */

import {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    MessageFlags
} from 'discord.js';
import { runDraw } from '../games/draw.js';
import { divideIntoTeams } from '../games/teamSplit.js';
import {
    setParticipants,
    setResults,
    runLadder,
} from '../games/ladder.js';
import {
    handleStartServer,
    handleStopServer,
    handleRunningServers,
    handleListServers,
    loadServers,
    saveServers,
    validateServerPath,
    runningServers,
    handleUpdateServers,
} from '../../server/serverMng.js';

/**
 * 서버의 음성 채널 목록을 가져와 선택 메뉴를 생성
 */
function createVoiceChannelSelectMenu(interaction, customId) {
    const voiceChannels = interaction.guild.channels.cache
        .filter(channel => channel.type === ChannelType.GuildVoice)
        .map(channel => ({
            label: channel.name,
            value: channel.id,
            description: `멤버 수: ${channel.members.size}명`,
        }));

    if (voiceChannels.length === 0) {
        return null;
    }

    const limitedChannels = voiceChannels.slice(0, 25);

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder('음성 채널을 선택하세요')
        .addOptions(limitedChannels);

    return new ActionRowBuilder().addComponents(selectMenu);
}

/**
 * 직접 입력 버튼을 생성
 */
function createDirectInputButton(customId) {
    const button = new ButtonBuilder()
        .setCustomId(customId)
        .setLabel('직접 입력하기')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('✏️');

    return new ActionRowBuilder().addComponents(button);
}

/**
 * 제비뽑기 슬래시 명령어 핸들러
 */
export async function handleDrawSlashCommand(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const drawCount = interaction.options.getInteger('당첨자수');
    const directParticipants = interaction.options.getString('참가자');

    if (directParticipants) {
        const participants = directParticipants.split(/\s+/).filter(p => p.trim());

        if (participants.length < drawCount) {
            await interaction.editReply({
                content: `❌ 참가자 수(${participants.length})가 당첨자 수(${drawCount})보다 적습니다.`
            });
            return;
        }

        try {
            const winners = runDraw(participants, drawCount);
            await interaction.editReply({
                content: `🎉 **제비뽑기 결과**\n당첨자: ${winners.join(', ')}`
            });
        } catch (error) {
            await interaction.editReply({
                content: `❌ 오류가 발생했습니다: ${error.message}`
            });
        }
        return;
    }

    const voiceChannelMenu = createVoiceChannelSelectMenu(interaction, `draw_voice_${drawCount}`);
    const directInputButton = createDirectInputButton(`draw_direct_${drawCount}`);

    if (!voiceChannelMenu) {
        await interaction.editReply({
            content: '❌ 사용 가능한 음성 채널이 없습니다.'
        });
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle('🎲 제비뽑기')
        .setDescription(`당첨자 **${drawCount}명**을 뽑습니다.\n아래에서 음성 채널을 선택하거나 직접 입력하세요.`)
        .setColor('#FF6B6B');

    await interaction.editReply({
        embeds: [embed],
        components: [voiceChannelMenu, directInputButton]
    });
}

/**
 * 팀 나누기 슬래시 명령어 핸들러
 */
export async function handleTeamSplitSlashCommand(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const teamCount = interaction.options.getInteger('팀수');
    const directParticipants = interaction.options.getString('참가자');

    if (directParticipants) {
        const participants = directParticipants.split(/\s+/).filter(p => p.trim());

        if (participants.length < teamCount) {
            await interaction.editReply({
                content: `❌ 참가자 수(${participants.length})가 팀 수(${teamCount})보다 적습니다.`
            });
            return;
        }

        try {
            const teams = divideIntoTeams(participants, teamCount);

            const embed = new EmbedBuilder()
                .setTitle('👥 팀 나누기 결과')
                .setColor('#4ECDC4');

            teams.forEach((team, index) => {
                embed.addFields({
                    name: `팀 ${index + 1}`,
                    value: team.join(', ') || '없음',
                    inline: true
                });
            });

            await interaction.channel.send({ embeds: [embed] });
            await interaction.editReply({ content: '✅ 결과가 채널에 공개되었습니다.' });
        } catch (error) {
            await interaction.editReply({
                content: `❌ 오류가 발생했습니다: ${error.message}`
            });
        }
        return;
    }

    const voiceChannelMenu = createVoiceChannelSelectMenu(interaction, `team_voice_${teamCount}`);
    const directInputButton = createDirectInputButton(`team_direct_${teamCount}`);

    if (!voiceChannelMenu) {
        await interaction.editReply({
            content: '❌ 사용 가능한 음성 채널이 없습니다.'
        });
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle('👥 팀 나누기')
        .setDescription(`**${teamCount}개 팀**으로 나눕니다.\n아래에서 음성 채널을 선택하거나 직접 입력하세요.`)
        .setColor('#4ECDC4');

    await interaction.editReply({
        embeds: [embed],
        components: [voiceChannelMenu, directInputButton]
    });
}

/**
 * 사다리타기 슬래시 명령어 핸들러
 */
export async function handleLadderSlashCommand(interaction) {
    const participantsStr = interaction.options.getString('참가자들');
    const resultsStr = interaction.options.getString('결과들');

    const participants = participantsStr.split(/\s+/).filter(p => p.trim());
    const results = resultsStr.split(/\s+/).filter(r => r.trim());

    if (participants.length !== results.length) {
        await interaction.reply({
            content: `❌ 참가자 수(${participants.length})와 결과 수(${results.length})가 일치하지 않습니다.`,
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    setParticipants(participants);
    setResults(results);

    try {
        const ladderResults = runLadder();
        const resultMessage = ladderResults.map(item => `**${item.participant}**: ${item.result}`).join('\n');

        const embed = new EmbedBuilder()
            .setTitle('🪜 사다리타기 결과')
            .setDescription(resultMessage)
            .setColor('#FFD93D');

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            flags: MessageFlags.Ephemeral
        });
    }
}

/**
 * 서버 관리 슬래시 명령어 핸들러
 */
export async function handleServerSlashCommand(interaction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
        case '목록':
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            handleListServers({ reply: (content) => interaction.editReply({ content }) });
            break;

        case '시작': {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const servers = loadServers();

            if (Object.keys(servers).length === 0) {
                await interaction.editReply({ content: '❌ 등록된 서버가 없습니다.' });
                return;
            }

            const serverOptions = Object.entries(servers).slice(0, 25).map(([name, info]) => ({
                label: name,
                value: name,
                description: info.detail.substring(0, 100)
            }));

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('server_start_select')
                .setPlaceholder('시작할 서버를 선택하세요')
                .addOptions(serverOptions);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.editReply({
                content: '🚀 **서버 시작**\n아래에서 시작할 서버를 선택하세요:',
                components: [row]
            });
            break;
        }

        case '종료': {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const runningList = Object.keys(runningServers);

            if (runningList.length === 0) {
                await interaction.editReply({ content: '⚠️ 현재 실행 중인 서버가 없습니다.' });
                return;
            }

            const stopServerOptions = runningList.slice(0, 25).map(name => ({
                label: name,
                value: name,
            }));

            const stopSelectMenu = new StringSelectMenuBuilder()
                .setCustomId('server_stop_select')
                .setPlaceholder('종료할 서버를 선택하세요')
                .addOptions(stopServerOptions);

            const stopRow = new ActionRowBuilder().addComponents(stopSelectMenu);

            await interaction.editReply({
                content: '🛑 **서버 종료**\n아래에서 종료할 서버를 선택하세요:',
                components: [stopRow]
            });
            break;
        }

        case '추가': {
            const serverName = interaction.options.getString('서버명');
            const serverPath = interaction.options.getString('경로');
            const description = interaction.options.getString('설명');
            const gameId = interaction.options.getString('게임아이디') ?? '';
            const stopCommand = interaction.options.getString('종료명령어') ?? 'quit';

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const servers = loadServers();
            if (servers[serverName]) {
                await interaction.editReply({ content: `❌ **${serverName}** 서버는 이미 존재합니다.` });
                return;
            }

            servers[serverName] = {
                path: validateServerPath(serverPath),
                gameId,
                detail: description,
                stopCommand,
            };
            saveServers(servers);
            await interaction.editReply({
                content: `✅ **${serverName}** 서버 추가 완료.\n📂 경로: **${serverPath}**\n📄 설명: **${description}**`
            });
            break;
        }

        case '제거': {
            const serverName = interaction.options.getString('서버명');
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const servers = loadServers();
            if (!servers[serverName]) {
                await interaction.editReply({ content: `❌ **${serverName}** 서버를 찾을 수 없습니다.` });
                return;
            }

            delete servers[serverName];
            saveServers(servers);
            await interaction.editReply({ content: `🗑️ **${serverName}** 서버가 목록에서 제거되었습니다.` });
            break;
        }

        case '상태': {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const running = Object.keys(runningServers);
            const content = running.length === 0
                ? '현재 실행 중인 서버가 없습니다.'
                : `실행 중인 서버 목록:\n- ${running.join('\n- ')}`;
            await interaction.editReply({ content });
            break;
        }

        case '업데이트': {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const servers = loadServers();

            if (Object.keys(servers).length === 0) {
                await interaction.editReply({ content: '❌ 등록된 서버가 없습니다.' });
                return;
            }

            const updateServerOptions = Object.entries(servers).slice(0, 25).map(([name, info]) => ({
                label: name,
                value: name,
                description: info.detail.substring(0, 100)
            }));

            const updateSelectMenu = new StringSelectMenuBuilder()
                .setCustomId('server_update_select')
                .setPlaceholder('업데이트할 서버를 선택하세요')
                .addOptions(updateServerOptions);

            const updateRow = new ActionRowBuilder().addComponents(updateSelectMenu);

            await interaction.editReply({
                content: '🔄 **서버 업데이트**\n아래에서 업데이트할 서버를 선택하세요:',
                components: [updateRow]
            });
            break;
        }
    }
}

/**
 * 도움말 슬래시 명령어 핸들러
 */
export async function handleHelpSlashCommand(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('🤖 봇 명령어 가이드')
        .setDescription('사용 가능한 모든 명령어들입니다:')
        .addFields(
            {
                name: '🎲 /제비뽑기',
                value: '• `당첨자수`: 뽑을 당첨자 수\n• `참가자`: 직접 입력 (선택사항)',
                inline: false
            },
            {
                name: '👥 /팀나누기',
                value: '• `팀수`: 나눌 팀의 수\n• `참가자`: 직접 입력 (선택사항)',
                inline: false
            },
            {
                name: '🪜 /사다리',
                value: '• `참가자들`: 공백으로 구분된 참가자 목록\n• `결과들`: 공백으로 구분된 결과 목록\n(참가자 수와 결과 수가 같아야 합니다)',
                inline: false
            },
            {
                name: '🖥️ /서버',
                value: '• `/서버 목록`: 등록된 서버 목록\n• `/서버 시작`: 서버 선택 후 시작\n• `/서버 종료`: 실행 중 서버 선택 후 종료\n• `/서버 상태`: 현재 실행 중인 서버 확인\n• `/서버 업데이트`: 서버 선택 후 업데이트\n• `/서버 추가/제거`: 서버 등록/삭제',
                inline: false
            }
        )
        .setColor('#A8E6CF')
        .setFooter({ text: '모든 명령어는 자동완성을 지원합니다!' });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
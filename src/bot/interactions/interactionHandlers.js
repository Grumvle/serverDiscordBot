/**
 * Discord 인터랙션 핸들러 모듈
 * 버튼 클릭, 선택 메뉴, 모달 등의 인터랙션을 처리
 */

import {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    EmbedBuilder,
    MessageFlags
} from 'discord.js';
import { runDraw } from '../games/draw.js';
import { divideIntoTeams } from '../games/teamSplit.js';
import { getVoiceChannelMembersByNickname } from '../../utils/utils.js';
import {
    handleStartServer,
    handleUpdateServers,
    handleStopServer,
    runningServers
} from '../../server/serverMng.js';

/**
 * 선택 메뉴 인터랙션 핸들러
 */
export async function handleSelectMenuInteraction(interaction) {
    const [action, type, ...params] = interaction.customId.split('_');

    if (action === 'draw' && type === 'voice') {
        const drawCount = parseInt(params[0]);
        const channelId = interaction.values[0];

        try {
            const channel = await interaction.client.channels.fetch(channelId);
            const participants = channel.members.map(member => member.nickname || member.user.username);

            if (participants.length === 0) {
                await interaction.update({
                    content: '❌ 선택한 음성 채널에 참가자가 없습니다.',
                    components: [],
                    embeds: []
                });
                return;
            }

            if (participants.length < drawCount) {
                await interaction.update({
                    content: `❌ 참가자 수(${participants.length})가 당첨자 수(${drawCount})보다 적습니다.`,
                    components: [],
                    embeds: []
                });
                return;
            }

            const winners = runDraw(participants, drawCount);

            const embed = new EmbedBuilder()
                .setTitle('🎉 제비뽑기 결과')
                .setDescription(`**${channel.name}** 채널에서 진행된 제비뽑기`)
                .addFields(
                    {
                        name: '참가자',
                        value: participants.join(', '),
                        inline: false
                    },
                    {
                        name: '당첨자',
                        value: winners.join(', '),
                        inline: false
                    }
                )
                .setColor('#FF6B6B')
                .setTimestamp();

            // 결과를 전체 채널에 공개
            await interaction.update({
                content: '',
                embeds: [embed],
                components: []
            });

        } catch (error) {
            console.error('인터랙션 처리 중 오류:', error);

            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.update({
                        content: `❌ 오류가 발생했습니다: ${error.message}`,
                        components: [],
                        embeds: []
                    });
                }
            } catch (updateError) {
                console.error('인터랙션 업데이트 실패:', updateError);
            }
        }
    }

    else if (action === 'team' && type === 'voice') {
        const teamCount = parseInt(params[0]);
        const channelId = interaction.values[0];

        try {
            const channel = await interaction.client.channels.fetch(channelId);
            const participants = channel.members.map(member => member.nickname || member.user.username);

            if (participants.length === 0) {
                await interaction.update({
                    content: '❌ 선택한 음성 채널에 참가자가 없습니다.',
                    components: [],
                    embeds: []
                });
                return;
            }

            if (participants.length < teamCount) {
                await interaction.update({
                    content: `❌ 참가자 수(${participants.length})가 팀 수(${teamCount})보다 적습니다.`,
                    components: [],
                    embeds: []
                });
                return;
            }

            const teams = divideIntoTeams(participants, teamCount);

            const embed = new EmbedBuilder()
                .setTitle('👥 팀 나누기 결과')
                .setDescription(`**${channel.name}** 채널에서 진행된 팀 나누기`)
                .setColor('#4ECDC4')
                .setTimestamp();

            teams.forEach((team, index) => {
                embed.addFields({
                    name: `팀 ${index + 1} (${team.length}명)`,
                    value: team.join(', ') || '없음',
                    inline: true
                });
            });

            // 결과를 전체 채널에 공개
            await interaction.channel.send({ embeds: [embed] });
            await interaction.update({
                content: '✅ 결과가 채널에 공개되었습니다.',
                embeds: [],
                components: []
            });

        } catch (error) {
            console.error('인터랙션 처리 중 오류:', error);

            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.update({
                        content: `❌ 오류가 발생했습니다: ${error.message}`,
                        components: [],
                        embeds: []
                    });
                }
            } catch (updateError) {
                console.error('인터랙션 업데이트 실패:', updateError);
            }
        }
    }

    else if (action === 'server' && type === 'start') {
        const selectedServer = interaction.values[0];

        if (runningServers[selectedServer]) {
            await interaction.update({
                content: `⚠️ **${selectedServer}** 서버는 이미 실행 중입니다.`,
                components: []
            });
            return;
        }

        await interaction.update({ components: [] });

        const mockMessage = {
            reply: async (content) => {
                const msg = await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
                return {
                    edit: async (newContent) => await interaction.webhook.editMessage(msg.id, { content: newContent })
                };
            },
            channel: { send: async (content) => await interaction.channel.send(content) }
        };

        await handleStartServer(interaction.client, mockMessage, [`"${selectedServer}"`]);
    }

    else if (action === 'server' && type === 'stop') {
        const selectedServer = interaction.values[0];

        await interaction.update({ components: [] });

        const mockMessage = {
            reply: async (content) => {
                const msg = await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
                return {
                    edit: async (newContent) => await interaction.webhook.editMessage(msg.id, { content: newContent })
                };
            },
            channel: { send: async (content) => await interaction.channel.send(content) }
        };

        await handleStopServer(interaction.client, mockMessage, [`"${selectedServer}"`]);
    }

    else if (action === 'text' && type === 'server' && params[0] === 'stop') {
        const selectedServer = interaction.values[0];

        await interaction.update({ components: [], embeds: [] });

        const mockMessage = {
            reply: async (content) => {
                const msg = await interaction.followUp({ content });
                return {
                    edit: async (newContent) => await msg.edit(newContent)
                };
            },
            channel: { send: async (content) => await interaction.channel.send(content) }
        };

        await handleStopServer(interaction.client, mockMessage, [`"${selectedServer}"`]);
    }

    else if (action === 'server' && type === 'update') {
        const selectedServer = interaction.values[0];

        await interaction.update({ components: [] });

        const mockMessage = {
            reply: async (content) => {
                const msg = await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
                return {
                    edit: async (newContent) => await interaction.webhook.editMessage(msg.id, { content: newContent })
                };
            },
            channel: { send: async (content) => await interaction.channel.send(content) }
        };

        await handleUpdateServers(interaction.client, mockMessage, [`"${selectedServer}"`]);
    }

    else if (action === 'text' && type === 'server' && params[0] === 'update') {
        const selectedServer = interaction.values[0];

        await interaction.update({ components: [], embeds: [] });

        const mockMessage = {
            reply: async (content) => await interaction.followUp({ content }),
            channel: { send: async (content) => await interaction.channel.send(content) }
        };

        await handleUpdateServers(interaction.client, mockMessage, [`"${selectedServer}"`]);
    }

    else if (action === 'text' && type === 'server' && params[0] === 'start') {
        const selectedServer = interaction.values[0];

        if (runningServers[selectedServer]) {
            await interaction.update({
                content: `⚠️ **${selectedServer}** 서버는 이미 실행 중입니다.`,
                components: [],
                embeds: []
            });
            return;
        }

        await interaction.update({ components: [], embeds: [] });

        const mockMessage = {
            reply: async (content) => await interaction.followUp({ content }),
            channel: { send: async (content) => await interaction.channel.send(content) }
        };

        await handleStartServer(interaction.client, mockMessage, [`"${selectedServer}"`]);

        console.log(`${interaction.user.username}님이 ${selectedServer} 서버를 선택했습니다.`);
    }
}

/**
 * 버튼 인터랙션 핸들러
 */
export async function handleButtonInteraction(interaction) {
    const [action, type, ...params] = interaction.customId.split('_');

    if (action === 'draw' && type === 'direct') {
        const drawCount = parseInt(params[0]);

        const modal = new ModalBuilder()
            .setCustomId(`draw_modal_${drawCount}`)
            .setTitle('제비뽑기 - 직접 입력');

        const participantsInput = new TextInputBuilder()
            .setCustomId('participants')
            .setLabel('참가자들을 입력하세요 (공백으로 구분)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('예: 홍길동 김철수 이영희 박민수')
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(1000);

        const row = new ActionRowBuilder().addComponents(participantsInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
    }

    else if (action === 'team' && type === 'direct') {
        const teamCount = parseInt(params[0]);

        const modal = new ModalBuilder()
            .setCustomId(`team_modal_${teamCount}`)
            .setTitle('팀 나누기 - 직접 입력');

        const participantsInput = new TextInputBuilder()
            .setCustomId('participants')
            .setLabel('참가자들을 입력하세요 (공백으로 구분)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('예: 홍길동 김철수 이영희 박민수')
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(1000);

        const row = new ActionRowBuilder().addComponents(participantsInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
    }
}

/**
 * 모달 제출 핸들러
 */
export async function handleModalSubmit(interaction) {
    const [action, type, ...params] = interaction.customId.split('_');

    if (action === 'draw' && type === 'modal') {
        const drawCount = parseInt(params[0]);
        const participantsText = interaction.fields.getTextInputValue('participants');
        const participants = participantsText.split(/\s+/).filter(p => p.trim());

        if (participants.length < drawCount) {
            await interaction.reply({
                content: `❌ 참가자 수(${participants.length})가 당첨자 수(${drawCount})보다 적습니다.`,
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        try {
            const winners = runDraw(participants, drawCount);

            const embed = new EmbedBuilder()
                .setTitle('🎉 제비뽑기 결과')
                .setDescription('직접 입력으로 진행된 제비뽑기')
                .addFields(
                    {
                        name: '참가자',
                        value: participants.join(', '),
                        inline: false
                    },
                    {
                        name: '당첨자',
                        value: winners.join(', '),
                        inline: false
                    }
                )
                .setColor('#FF6B6B')
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            await interaction.reply({
                content: `❌ 오류가 발생했습니다: ${error.message}`,
                flags: MessageFlags.Ephemeral
            });
        }
    }

    else if (action === 'team' && type === 'modal') {
        const teamCount = parseInt(params[0]);
        const participantsText = interaction.fields.getTextInputValue('participants');
        const participants = participantsText.split(/\s+/).filter(p => p.trim());

        if (participants.length < teamCount) {
            await interaction.reply({
                content: `❌ 참가자 수(${participants.length})가 팀 수(${teamCount})보다 적습니다.`,
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        try {
            const teams = divideIntoTeams(participants, teamCount);

            const embed = new EmbedBuilder()
                .setTitle('👥 팀 나누기 결과')
                .setDescription('직접 입력으로 진행된 팀 나누기')
                .setColor('#4ECDC4')
                .setTimestamp();

            teams.forEach((team, index) => {
                embed.addFields({
                    name: `팀 ${index + 1} (${team.length}명)`,
                    value: team.join(', ') || '없음',
                    inline: true
                });
            });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            await interaction.reply({
                content: `❌ 오류가 발생했습니다: ${error.message}`,
                flags: MessageFlags.Ephemeral
            });
        }
    }
}
/**
 * 서버 관리 명령어 핸들러 모듈
 * 서버 추가/제거/시작/종료 등의 관리 기능을 처리
 */

import {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder
} from 'discord.js';
import {
    handleAddServer,
    handleStartServer,
    handleStopServer,
    handleRunningServers,
    handleRemoveServer,
    handleListServers,
    loadServers,
    runningServers,
    handleUpdateServers,
} from '../../server/serverMng.js';

export async function handleServerStartWithSelectMenu(client, message) {
    const servers = loadServers();
    if (Object.keys(servers).length === 0) {
        message.reply('⚠️ 등록된 서버가 없습니다.');
        return;
    }

    // 서버 목록을 드롭다운 옵션으로 변환 (최대 25개)
    const serverOptions = Object.entries(servers).slice(0, 25).map(([name, info]) => ({
        label: name,
        value: name,
        description: info.detail.substring(0, 100), // Discord 제한으로 100자까지
        emoji: '🖥️'
    }));

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('text_server_start_select')
        .setPlaceholder('🚀 시작할 서버를 선택하세요')
        .addOptions(serverOptions);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const embed = new EmbedBuilder()
        .setTitle('🚀 서버 시작')
        .setDescription(`총 **${serverOptions.length}개**의 서버가 등록되어 있습니다.\n아래 드롭다운에서 시작할 서버를 선택하세요.`)
        .setColor('#00FF00')
        .addFields({
            name: '📋 등록된 서버 목록',
            value: serverOptions.map(option => `🖥️ **${option.label}**\n   └ ${option.description}`).join('\n\n'),
            inline: false
        })
        .setFooter({ text: '⏰ 30초 후 자동으로 만료됩니다.' });

    const sentMessage = await message.reply({
        embeds: [embed],
        components: [row]
    });

    // 30초 후 자동으로 컴포넌트 비활성화
    setTimeout(async () => {
        try {
            const disabledRow = new ActionRowBuilder().addComponents(
                StringSelectMenuBuilder.from(selectMenu).setDisabled(true)
            );
            await sentMessage.edit({
                embeds: [embed.setFooter({ text: '⏰ 선택 시간이 만료되었습니다.' })],
                components: [disabledRow]
            });
        } catch (error) {
            console.error('메뉴 비활성화 실패:', error);
        }
    }, 30000);
}

export function createServerCommandHandlers() {
    return {
        '$서버추가': (message, args) => handleAddServer(message, args),
        '$서버목록': (message) => handleListServers(message),
        '$서버시작': (client, message) => handleServerStartWithSelectMenu(client, message),
        '$서버종료': (client, message, args) => handleStopServer(client, message, args),
        '$서버제거': (message, args) => handleRemoveServer(message, args),
        '$실행서버': (message) => handleRunningServers(message),
        '$업데이트': (client, message, args) => handleUpdateServers(client, message, args),
    };
}
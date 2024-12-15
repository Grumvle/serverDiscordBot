import { EmbedBuilder } from 'discord.js';

/**
 * 참가자들을 팀으로 나누는 함수
 * @param {Array<string>} participants - 참가자 목록
 * @param {number} teamCount - 팀 수
 * @returns {Array<Array<string>>} - 팀이 포함된 배열
 */
export function divideIntoTeams(participants, teamCount) {
    if (participants.length < teamCount) throw new Error('팀의 수가 참가자보다 많을 수 없습니다.');

    const shuffledParticipants = [...participants].sort(() => Math.random() - 0.5);
    const teams = Array.from({ length: teamCount }, () => []);

    shuffledParticipants.forEach((participant, index) => {
        const teamIndex = index % teamCount;
        teams[teamIndex].push(participant);
    });

    return teams;
}

/**
 * 팀 결과를 임베드로 출력하는 함수
 * @param {object} message - Discord 메시지 객체
 * @param {Array<Array<string>>} teams - 팀이 포함된 배열
 */
export function sendTeamEmbed(message, teams) {
    const embed = new EmbedBuilder()
        .setTitle('🔹 랜덤 팀 배정 🔹')
        .setColor('#00FF00')
        .setTimestamp();

    teams.forEach((team, index) => {
        embed.addFields({ name: `**팀 ${index + 1}**`, value: team.join('\n'), inline: true });
    });

    message.reply({ embeds: [embed] });
}
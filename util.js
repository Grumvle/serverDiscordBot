/**
 * 음성 채널에 있는 멤버의 닉네임을 가져오는 함수
 * @param {object} client - Discord 클라이언트
 * @param {string} identifier - 채널 이름 또는 채널 ID
 * @returns {Promise<Array<string>>} - 닉네임 목록
 */
export default async function getVoiceChannelMembersByNickname(client, identifier) {
    let channel;

    try {
        channel = await client.channels.fetch(identifier);
    } catch (error) {
        // ID로 찾을 수 없으면 이름으로 찾기
    }

    if (!channel) {
        channel = client.channels.cache.find(
            ch => ch.name.toLowerCase().trim() === identifier.toLowerCase().trim() && ch.type === 2
        );
    }

    if (!channel) {
        return [];
    }

    const nicknames = channel.members.map(member => member.nickname || member.user.username);
    return nicknames;
}
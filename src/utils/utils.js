/**
 * 음성 채널에 있는 멤버의 닉네임을 가져오는 함수
 * @param {object} client - Discord 클라이언트
 * @param {string} identifier - 채널 이름 또는 채널 ID
 * @returns {Promise<Array<string>>} - 닉네임 목록
 */
export async function getVoiceChannelMembersByNickname(client, identifier) {
    if (!client) {
        throw new Error('Discord 클라이언트가 제공되지 않았습니다.');
    }

    if (!identifier || typeof identifier !== 'string') {
        throw new Error('유효한 채널 이름 또는 ID를 제공해주세요.');
    }

    let channel;

    try {
        if (/^\d+$/.test(identifier)) {
            channel = await client.channels.fetch(identifier);
        }
    } catch (error) {
        console.log(`채널 ID ${identifier}로 찾을 수 없습니다. 이름으로 검색합니다.`);
    }

    if (!channel) {
        try {
            channel = client.channels.cache.find(
                ch => ch.name.toLowerCase().trim() === identifier.toLowerCase().trim() && ch.type === 2
            );
        } catch (error) {
            console.error('채널 검색 중 오류:', error);
            throw new Error('채널 검색 중 오류가 발생했습니다.');
        }
    }

    if (!channel) {
        return [];
    }

    if (channel.type !== 2) {
        throw new Error('지정된 채널이 음성 채널이 아닙니다.');
    }

    try {
        const nicknames = channel.members.map(member => member.nickname || member.user.username);
        return nicknames;
    } catch (error) {
        console.error('멤버 목록 가져오기 실패:', error);
        throw new Error('음성 채널 멤버 목록을 가져올 수 없습니다.');
    }
}


/**
 * 배열을 랜덤하게 섞는 함수
 * @param {Array} array - 섞고자 하는 배열
 * @returns {Array} - 섞인 배열
 */
export function shuffle(array) {
    if (!Array.isArray(array)) {
        throw new Error('배열이 아닌 값이 제공되었습니다.');
    }

    if (array.length === 0) {
        return [];
    }

    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
// 참가자와 결과를 저장하는 배열
let participants = [];
let results = [];

/**
 * 참가자 설정 함수
 * @param {Array<string>} names - 참가자 이름 배열
 */
export function setParticipants(names) {
    participants = names;
}

/**
 * 결과 설정 함수
 * @param {Array<string>} resultList - 결과 배열
 */
export function setResults(resultList) {
    results = resultList;
}

/**
 * 사다리타기 실행
 * @returns {Array<Object>} - 참가자와 결과가 매칭된 배열
 */
export function runLadder() {
    if (participants.length === 0 || results.length === 0) {
        throw new Error('참가자 또는 결과가 설정되지 않았습니다.');
    }

    if (participants.length !== results.length) {
        throw new Error('참가자 수와 결과 수가 일치하지 않습니다.');
    }

    const shuffledParticipants = [...participants]; // 참가자 배열 복사
    const shuffledResults = [...results]; // 결과 배열 복사

    const finalResults = [];
    while (shuffledParticipants.length > 0) {
        const randomParticipantIndex = Math.floor(Math.random() * shuffledParticipants.length);
        const randomResultIndex = Math.floor(Math.random() * shuffledResults.length);

        finalResults.push({
            participant: shuffledParticipants[randomParticipantIndex],
            result: shuffledResults[randomResultIndex],
        });

        shuffledParticipants.splice(randomParticipantIndex, 1); // 참가자 제거
        shuffledResults.splice(randomResultIndex, 1); // 결과 제거
    }

    return finalResults;
}

/**
 * 음성 채널 멤버를 참가자로 설정
 * @param {Array<string>} members - 음성 채널 멤버 이름 배열
 */
export function setParticipantsFromVoiceChannel(members) {
    participants = members;
}
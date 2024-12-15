import { shuffle } from './utils.js';

/**
 * 제비뽑기를 실행하는 함수
 * @param {Array<string>} participants - 참가자 목록
 * @param {number} drawCount - 당첨 인원 수
 * @returns {Array<string>} - 당첨된 참가자 목록
 */
export function runDraw(participants, drawCount) {
    if (participants.length < drawCount) throw new Error('참가자보다 당첨 인원이 많을 수 없습니다.');
    const shuffledParticipants = shuffle(participants);
    return shuffledParticipants.slice(0, drawCount);
}
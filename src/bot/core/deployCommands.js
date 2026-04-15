/**
 * Discord 슬래시 명령어 등록 스크립트
 * 봇의 모든 슬래시 명령어를 Discord API에 등록합니다.
 */

import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .env 파일 로드
dotenv.config({ path: join(__dirname, '../../config/.env') });

const commands = [
    // 제비뽑기 명령어
    new SlashCommandBuilder()
        .setName('제비뽑기')
        .setDescription('제비뽑기를 진행합니다')
        .addIntegerOption(option =>
            option.setName('당첨자수')
                .setDescription('당첨자 수를 입력하세요')
                .setRequired(true)
                .setMinValue(1)
        )
        .addStringOption(option =>
            option.setName('참가자')
                .setDescription('참가자를 직접 입력하세요 (선택사항)')
                .setRequired(false)
        ),

    // 팀 나누기 명령어
    new SlashCommandBuilder()
        .setName('팀나누기')
        .setDescription('팀을 나눕니다')
        .addIntegerOption(option =>
            option.setName('팀수')
                .setDescription('나눌 팀의 수를 입력하세요')
                .setRequired(true)
                .setMinValue(2)
        )
        .addStringOption(option =>
            option.setName('참가자')
                .setDescription('참가자를 직접 입력하세요 (선택사항)')
                .setRequired(false)
        ),

    // 사다리타기 명령어
    new SlashCommandBuilder()
        .setName('사다리')
        .setDescription('사다리타기를 진행합니다')
        .addSubcommand(subcommand =>
            subcommand
                .setName('설정')
                .setDescription('사다리타기 참가자를 설정합니다')
                .addStringOption(option =>
                    option.setName('참가자들')
                        .setDescription('참가자들을 공백으로 구분하여 입력하세요')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('결과')
                .setDescription('사다리타기 결과를 설정합니다')
                .addStringOption(option =>
                    option.setName('결과들')
                        .setDescription('결과들을 공백으로 구분하여 입력하세요')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('시작')
                .setDescription('사다리타기를 시작합니다')
        ),

    // 서버 관리 명령어
    new SlashCommandBuilder()
        .setName('서버')
        .setDescription('게임 서버를 관리합니다')
        .addSubcommand(subcommand =>
            subcommand
                .setName('목록')
                .setDescription('등록된 서버 목록을 확인합니다')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('시작')
                .setDescription('서버를 시작합니다')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('종료')
                .setDescription('서버를 종료합니다')
                .addStringOption(option =>
                    option.setName('서버명')
                        .setDescription('종료할 서버 이름')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('추가')
                .setDescription('새 서버를 등록합니다')
                .addStringOption(option =>
                    option.setName('서버명')
                        .setDescription('서버 이름')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('경로')
                        .setDescription('서버 실행 파일 경로')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('설명')
                        .setDescription('서버 설명')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('제거')
                .setDescription('서버를 제거합니다')
                .addStringOption(option =>
                    option.setName('서버명')
                        .setDescription('제거할 서버 이름')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('상태')
                .setDescription('현재 실행 중인 서버를 확인합니다')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('업데이트')
                .setDescription('서버를 업데이트합니다')
                .addStringOption(option =>
                    option.setName('서버명')
                        .setDescription('업데이트할 서버 이름')
                        .setRequired(true)
                )
        ),

    // 도움말 명령어
    new SlashCommandBuilder()
        .setName('도움말')
        .setDescription('사용 가능한 모든 명령어를 확인합니다'),
].map(command => command.toJSON());

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// 명령어 등록
(async () => {
    try {
        console.log('슬래시 명령어 등록을 시작합니다...');

        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log(`${data.length}개의 슬래시 명령어가 성공적으로 등록되었습니다.`);
    } catch (error) {
        console.error('명령어 등록 중 오류가 발생했습니다:', error);
    }
})();
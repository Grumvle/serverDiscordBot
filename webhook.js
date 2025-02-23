import express from "express";
import { exec } from "child_process";
import 'dotenv/config';

const app = express();
const PORT = 4000; // Webhook 서버 포트
const projectPath = process.env.projectPath; // 환경 변수로 프로젝트 경로 설정

app.use(express.json());

if (!projectPath) {
    console.error("❌ 환경 변수 'projectPath'가 설정되지 않았습니다.");
    process.exit(1); // 환경 변수 오류 시 서버 종료
}

// 🔹 GitHub Webhook 엔드포인트
app.post("/webhook", (req, res) => {
    console.log("🔄 GitHub Webhook 감지됨!");

    exec(`cd ${projectPath} && git fetch origin main`, () => {
        exec("git rev-parse HEAD", (err, localHash) => {
            exec("git rev-parse origin/main", (err, remoteHash) => {
                if (localHash.trim() !== remoteHash.trim()) {
                    console.log("🚀 업데이트 감지! git pull 실행...");
                    exec(`cd ${projectPath} && git pull origin main && npm install && pm2 restart serverDiscordBot`, (error, stdout) => {
                        if (error) {
                            console.error(`❌ 업데이트 중 오류 발생: ${error.message}`);
                            return res.status(500).send("업데이트 중 오류 발생!");
                        }
                        console.log(stdout);

                        // 🔹 webhook.js 변경 감지 후 Webhook 서버 재시작
                        exec(`git diff --name-only HEAD~1 HEAD`, (err, stdout) => {
                            if (stdout.includes("webhook.js")) {
                                console.log("📌 webhook.js 변경 감지! Webhook 서버 재시작...");
                                exec("pm2 restart webhook-server");
                            }
                        });

                        res.status(200).send("✅ 업데이트 완료!");
                    });
                } else {
                    console.log("⏳ 변경 사항 없음.");
                    res.status(200).send("✅ 변경 사항 없음.");
                }
            });
        });
    });
});

// 🔹 Webhook 서버 실행
app.listen(PORT, () => {
    console.log(`🚀 Webhook 서버 실행 중! (포트: ${PORT})`);
});
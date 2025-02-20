import express from "express";
import { exec } from "child_process";
import 'dotenv/config';

const app = express();
const PORT = 4000; // 기존 서버와 다른 포트 사용
const projectPath = process.env.projectPath;

app.use(express.json());

// GitHub Webhook 엔드포인트
app.post("/webhook", (req, res) => {
    console.log("🔄 GitHub Webhook 감지됨!");

    // Git 변경 사항이 있는 경우만 업데이트 실행
    exec(`cd ${projectPath} && git fetch origin main`, () => {
        exec("git rev-parse HEAD", (err, localHash) => {
            exec("git rev-parse origin/main", (err, remoteHash) => {
                if (localHash.trim() !== remoteHash.trim()) {
                    console.log("🚀 업데이트 감지! git pull 실행");
                    exec("git pull origin main && npm install && pm2 restart DiscordBot", (error, stdout) => {
                        if (error) {
                            console.error(`❌ 오류 발생: ${error.message}`);
                            return res.status(500).send("업데이트 중 오류 발생!");
                        }
                        console.log(stdout);
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

// Webhook 서버 실행
app.listen(PORT, () => {
    console.log(`🚀 Webhook 서버 실행 중! (포트: ${PORT})`);
});
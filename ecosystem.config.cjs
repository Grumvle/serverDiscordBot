module.exports = {
  apps: [
    {
      name: "serverDiscordBot",
      script: "./src/bot/index.js",
      watch: true, // 코드 변경 시 자동 재시작
      autorestart: true, // 크래시 시 자동 재시작
    },
  ],
};

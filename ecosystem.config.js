module.exports = {
  apps: [
    {
      name: "serverDiscordBot",
      script: "index.js",
      watch: true, // 코드 변경 시 자동 재시작
      autorestart: true, // 크래시 시 자동 재시작
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "webhook-server",
      script: "webhook.js",
      watch: true,
      autorestart: true,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};

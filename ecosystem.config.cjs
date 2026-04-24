module.exports = {
  apps: [
    {                                                                                                                                                                                     
      name: 'serverDiscordBot',                                                                                                                                                           
      script: 'src/bot/index.js',  // 기존 경로 유지                                                                                                                                    
      cwd: 'D:/serverDiscordBot',  // 이 줄 추가                                                                                                                                          
      instances: 1,
      autorestart: true,                                                                                                                                                                  
      watch: true,                                                                                                                                                                     
      max_memory_restart: '300M',                                                                                                                                                         
      env: { NODE_ENV: 'production' },
    },
  ],
};

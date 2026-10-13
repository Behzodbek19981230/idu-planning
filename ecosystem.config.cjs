// PM2: pm2 start ecosystem.config.cjs && pm2 save
module.exports = {
  apps: [
    {
      name: 'idu-planning-api',
      cwd: __dirname + '/server',
      script: 'src/index.js',
      env: { NODE_ENV: 'production' },
      // fork: ES modul + top-level await uchun; bitta nusxaga cluster kerak emas
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '400M',
      time: true,
    },
  ],
};

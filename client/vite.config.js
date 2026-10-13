import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // telefondan tarmoq orqali ochish uchun
    proxy: { '/api': process.env.API_URL || 'http://localhost:4010' },
  },
  build: {
    chunkSizeWarningLimit: 1500, // antd alohida chunk'da
    rollupOptions: {
      output: {
        manualChunks: { antd: ['antd', '@ant-design/icons'], react: ['react', 'react-dom', 'react-router-dom'] },
      },
    },
  },
});

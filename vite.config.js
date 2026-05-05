import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // 빌드 시 파일 경로를 상대 경로로 설정하여 Electron에서 읽을 수 있게 합니다.
})
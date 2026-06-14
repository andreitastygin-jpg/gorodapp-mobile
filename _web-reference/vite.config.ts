
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      'react-native/Libraries/Utilities/codegenNativeComponent': path.resolve('./src/utils/emptyStub.ts'),
      'react-native-web/Libraries/Utilities/codegenNativeComponent': path.resolve('./src/utils/emptyStub.ts'),
      'react-native': path.resolve('./src/utils/reactNativeWebWrapper.ts'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  },
  server: {
    port: 3000
  }
});

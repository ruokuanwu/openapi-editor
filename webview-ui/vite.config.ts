import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => {
    const isDev = mode === 'development';

    return {
        plugins: [vue()],
        resolve: {
            alias: {
                '@shared': resolve(__dirname, '../shared'),
            },
        },
        build: {
            outDir: resolve(__dirname, '../out/webview'),
            emptyOutDir: true,
            sourcemap: isDev ? 'inline' : false,
            minify: isDev ? false : true,
            rollupOptions: {
                output: {
                    entryFileNames: 'assets/[name].js',
                    chunkFileNames: 'assets/[name].js',
                    assetFileNames: 'assets/[name].[ext]',
                },
            },
        },
        base: './',
    };
});

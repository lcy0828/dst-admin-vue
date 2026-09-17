import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [vue(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    define: {
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('/node_modules/')) return undefined
            if (id.includes('/zrender/')) return 'vendor-zrender'
            if (id.includes('/node_modules/echarts/lib/chart/')) return 'vendor-echarts-charts'
            if (id.includes('/node_modules/echarts/lib/component/')) return 'vendor-echarts-components'
            if (id.includes('/node_modules/echarts/')) return 'vendor-echarts'
            if (id.includes('/node_modules/ol/')) return 'vendor-openlayers'
            if (id.includes('/node_modules/xterm/') || id.includes('/node_modules/xterm-addon-fit/')) return 'vendor-terminal'
            return undefined
          }
        }
      }
    },
    server: {
      host: '127.0.0.1',
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000'
        }
      }
    },
    preview: {
      host: '127.0.0.1',
      port: 4173
    }
  }
})

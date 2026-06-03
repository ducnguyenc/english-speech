// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    ssr: true,

    devtools: { enabled: true },

    app: {
        head: {
            title: 'IPA Mastery - Luyện phát âm chuẩn',
            meta: [
                { charset: 'utf-8' },
                { name: 'viewport', content: 'width=device-width, initial-scale=1' },
            ],
            link: [
                { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
                { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
                { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
                { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=JetBrains+Mono:wght@400;500&family=Noto+Sans+JP:wght@400;700&display=swap' }
            ]
        }
    },

    css: ['~/assets/css/index.css'],

    runtimeConfig: {
        public: {
            azureRegion: process.env.AZURE_SPEECH_REGION || 'eastasia'
        },
        azureKey: process.env.AZURE_SPEECH_KEY,
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },

    modules: [
        '@vueuse/motion/nuxt'
    ],

    nitro: {
        preset: 'vercel'
    },

    compatibilityDate: '2024-04-03'
})

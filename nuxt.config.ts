// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  devServer: { https: true },
  css: ['~/assets/css/tailwind.css'],
  tailwindcss: {
    configPath: 'tailwind.config.ts'
  },
  modules: ['@nuxtjs/tailwindcss', 'nuxt-svgo', '@vueuse/nuxt'],
  components: [
    // Use filename-only auto-import (no directory prefix) so <Button>, <AppShell>, etc. work directly
    { path: '~/components', pathPrefix: false }
  ],
  // Server-only secrets — never exposed to the browser bundle.
  // Set via environment variables or a .env file (add .env to .gitignore).
  runtimeConfig: {
    supabaseUrl:        process.env.SUPABASE_URL        ?? '',
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY ?? '',
    lmStudioBaseUrl:    process.env.LM_STUDIO_BASE_URL  ?? 'http://localhost:1234',
    lmStudioModel:      process.env.LM_STUDIO_MODEL     ?? 'local-model',
    // public: {} — nothing here; no secrets go to the client
  }
})
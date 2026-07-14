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
  ]
})
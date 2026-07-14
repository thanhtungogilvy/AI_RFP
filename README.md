# AI_RFP

Nuxt 4 project with TailwindCSS, nuxt-svgo, VueUse, and shadcn-vue UI setup.

## Da setup duoc gi

- Nuxt 4 app base
- TailwindCSS module for Nuxt (`@nuxtjs/tailwindcss`)
- Nuxt SVGO module (`nuxt-svgo`)
- VueUse for Nuxt (`@vueuse/nuxt`)
- shadcn-vue initialized (`components.json`)
- shadcn-vue `button` component added
- Dev server configured to run HTTPS in local

## Cau hinh chinh

- Nuxt config: `nuxt.config.ts`
- Tailwind config (TypeScript only): `tailwind.config.ts`
- Tailwind stylesheet: `app/assets/css/tailwind.css`
- shadcn-vue config: `components.json`
- Sample shadcn button:
	- `app/components/ui/button/Button.vue`
	- `app/components/ui/button/buttonVariants.ts`
	- `app/components/ui/button/index.ts`

## Chay du an

Install dependencies:

```bash
npm install
```

Start dev server (HTTPS):

```bash
npm run dev
```

Note: browser may show a local certificate warning because this is local HTTPS.

## Build va preview

```bash
npm run build
npm run preview
```

## Lenh tien ich

Regenerate Nuxt types after config changes:

```bash
npm run postinstall
```

Add more shadcn-vue components:

```bash
npx shadcn-vue@latest add <component-name> -y
```

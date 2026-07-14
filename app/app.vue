<template>
  <div class="min-h-screen bg-background text-foreground">
    <NuxtRouteAnnouncer />
    <main class="mx-auto flex max-w-xl flex-col gap-4 px-6 py-16">
      <h1 class="text-3xl font-semibold tracking-tight">Nuxt + shadcn-vue</h1>
      <p class="text-sm text-muted-foreground">Tailwind config is TypeScript-only and components are ready to use.</p>
      <div class="flex items-center gap-3">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
      </div>
    </main>
  </div>
</template>

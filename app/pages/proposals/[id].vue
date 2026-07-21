<script setup lang="ts">
const route = useRoute()
const proposalId = route.params.id as string

const { proposal, loading, error, fetchProposal } = useProposalGeneration()

onMounted(() => fetchProposal(proposalId))
</script>

<template>
  <AppShell>
    <PageHeader title="Proposal Result" description="Your generated proposal is ready to download.">
      <template #actions>
        <NuxtLink to="/rfps">
          <Button variant="outline" size="sm">Back to RFPs</Button>
        </NuxtLink>
      </template>
    </PageHeader>

    <div class="max-w-xl">
      <div v-if="loading" class="h-40 animate-pulse rounded-lg bg-muted" />

      <div v-else-if="error" class="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
        <span>{{ error }}</span><Button size="sm" variant="outline" @click="fetchProposal(proposalId)">Retry</Button>
      </div>

      <template v-else-if="proposal">
        <ProposalDownloadCard :proposal="proposal" />

        <div v-if="proposal.status === 'generating'" class="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Generating proposal deck…
        </div>

        <div v-if="proposal.errorMessage" class="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {{ proposal.errorMessage }}
          <NuxtLink :to="`/rfps/${proposal.rfpId}/recommendations`" class="mt-2 block underline">Back to recommendations to retry</NuxtLink>
        </div>
      </template>

      <EmptyState
        v-else
        title="Proposal not found"
        description="This proposal does not exist or has been deleted."
      />
    </div>
  </AppShell>
</template>

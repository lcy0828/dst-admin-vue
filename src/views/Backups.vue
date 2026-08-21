<template>
  <div class="flex min-w-0 flex-col gap-6">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold">{{ $t('backups.title') }}</h1>
        <p class="mt-1 text-sm text-muted-foreground">{{ $t('backups.subtitle') }}</p>
      </div>
      <UiButton v-if="workspace === 'backups'" variant="outline" @click="workspace = 'imports'">
        <UploadIcon data-icon="inline-start" />
        {{ $t('backups.actions.import') }}
      </UiButton>
      <UiButton v-else variant="outline" @click="workspace = 'backups'">
        <ArrowLeftIcon data-icon="inline-start" />
        {{ $t('backups.actions.backToBackups') }}
      </UiButton>
    </header>

    <DistributedBackupPanel v-if="workspace === 'backups'" />
    <SaveImportsPanel v-else @rooms-changed="workspace = 'backups'" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ArrowLeftIcon, UploadIcon } from '@lucide/vue'
import { Button as UiButton } from '@/components/ui/button'
import DistributedBackupPanel from '@/views/backups/DistributedBackupPanel.vue'
import SaveImportsPanel from '@/views/backups/SaveImportsPanel.vue'

defineOptions({ name: 'BackupManagement' })

const workspace = ref('backups')
</script>

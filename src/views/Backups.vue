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

    <Tabs v-if="workspace === 'backups'" v-model="backupCategory" class="flex min-w-0 flex-col gap-4">
      <TabsList class="w-full sm:w-fit">
        <TabsTrigger value="saves" class="flex-1 sm:flex-none">
          <DatabaseBackupIcon data-icon="inline-start" />
          {{ $t('backups.tabs.saveBackups') }}
        </TabsTrigger>
        <TabsTrigger value="system" class="flex-1 sm:flex-none">
          <ShieldCheckIcon data-icon="inline-start" />
          {{ $t('backups.tabs.systemSnapshots') }}
        </TabsTrigger>
      </TabsList>
      <DistributedBackupPanel :category="backupCategory" />
    </Tabs>
    <SaveImportsPanel v-else @rooms-changed="workspace = 'backups'" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ArrowLeftIcon, DatabaseBackupIcon, ShieldCheckIcon, UploadIcon } from '@lucide/vue'
import { Button as UiButton } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import DistributedBackupPanel from '@/views/backups/DistributedBackupPanel.vue'
import SaveImportsPanel from '@/views/backups/SaveImportsPanel.vue'

defineOptions({ name: 'BackupManagement' })

const workspace = ref('backups')
const backupCategory = ref('saves')
</script>

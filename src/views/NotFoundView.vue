<template>
  <div class="flex min-h-[60vh] items-center justify-center p-4">
    <Empty class="max-w-lg border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CircleAlert />
        </EmptyMedia>
        <EmptyTitle>{{ $t('notFound.title') }}</EmptyTitle>
        <EmptyDescription class="break-all">
          {{ $t('notFound.description', { path: route.fullPath }) }}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button as-child>
          <RouterLink to="/dashboard">
            <House data-icon="inline-start" />
            {{ $t('notFound.backHome') }}
          </RouterLink>
        </Button>
      </EmptyContent>
    </Empty>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'
import { CircleAlert, House } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty'

const route = useRoute()
</script>

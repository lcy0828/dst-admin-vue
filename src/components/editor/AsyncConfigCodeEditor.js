import { defineAsyncComponent, h } from 'vue'
import { Skeleton } from '@/components/ui/skeleton'

export const AsyncConfigCodeEditor = defineAsyncComponent({
  loader: () => import('./ConfigCodeEditor.vue'),
  loadingComponent: {
    name: 'ConfigCodeEditorSkeleton',
    render() {
      return h(Skeleton, { class: 'h-[360px] w-full rounded-md' })
    }
  },
  delay: 80
})

export default AsyncConfigCodeEditor

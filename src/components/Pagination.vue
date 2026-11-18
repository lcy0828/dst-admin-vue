<template>
  <div v-if="!hidden && total > 0" class="pagination-container">
    <span class="pagination-total">{{ $t('common.pagination.total', { count: total }) }}</span>
    <UiSelect :model-value="String(pageSize)" @update:model-value="handleSizeSelect">
      <SelectTrigger :aria-label="$t('common.pagination.pageSize')" class="page-size-select w-[104px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem v-for="size in pageSizes" :key="size" :value="String(size)">
            {{ $t('common.pagination.perPage', { count: size }) }}
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </UiSelect>
    <ShadcnPagination
      :page="currentPage"
      :items-per-page="pageSize"
      :total="total"
      show-edges
      @update:page="handleCurrentChange"
    >
      <PaginationContent v-slot="{ items }">
        <PaginationPrevious><ChevronLeftIcon /><span class="sr-only">{{ $t('common.pagination.previous') }}</span></PaginationPrevious>
        <template v-for="(item, index) in items" :key="index">
          <PaginationItem
            v-if="item.type === 'page'"
            :value="item.value"
            :is-active="item.value === currentPage"
          >
            {{ item.value }}
          </PaginationItem>
          <PaginationEllipsis v-else :index="index" />
        </template>
        <PaginationNext><ChevronRightIcon /><span class="sr-only">{{ $t('common.pagination.next') }}</span></PaginationNext>
      </PaginationContent>
    </ShadcnPagination>
    <UiInput
      class="page-jumper"
      type="number"
      min="1"
      :max="pageCount"
      :model-value="currentPage"
      :aria-label="$t('common.pagination.jump')"
      @change="handleJump"
    />
  </div>
</template>

<script>
import { ChevronLeftIcon, ChevronRightIcon } from '@lucide/vue'
import { Input as UiInput } from '@/components/ui/input'
import {
  Pagination as ShadcnPagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination'
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default {
  name: 'AppPagination',
  components: {
    ChevronLeftIcon,
    ChevronRightIcon,
    UiInput,
    ShadcnPagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationNext,
    PaginationPrevious,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    UiSelect
  },
  props: {
    total: {
      required: true,
      type: Number
    },
    page: {
      type: Number,
      default: 1
    },
    limit: {
      type: Number,
      default: 20
    },
    pageSizes: {
      type: Array,
      default() {
        return [10, 20, 30, 50]
      }
    },
    layout: {
      type: String,
      default: 'total, sizes, prev, pager, next, jumper'
    },
    background: {
      type: Boolean,
      default: true
    },
    autoScroll: {
      type: Boolean,
      default: true
    },
    hidden: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    pageCount() {
      return Math.max(1, Math.ceil(this.total / this.pageSize))
    },
    currentPage: {
      get() {
        return this.page
      },
      set(val) {
        this.$emit('update:page', val)
      }
    },
    pageSize: {
      get() {
        return this.limit
      },
      set(val) {
        this.$emit('update:limit', val)
      }
    }
  },
  methods: {
    handleSizeSelect(val) {
      const next = Number(val)
      if (!Number.isFinite(next) || next <= 0) return
      this.pageSize = next
      this.handleSizeChange(next)
    },
    handleSizeChange(val) {
      this.$emit('pagination', { page: this.currentPage, limit: val })
    },
    handleCurrentChange(val) {
      this.currentPage = val
      this.$emit('pagination', { page: val, limit: this.pageSize })
    },
    handleJump(event) {
      const page = Math.min(this.pageCount, Math.max(1, Number(event.target.value) || 1))
      this.handleCurrentChange(page)
    }
  }
}
</script>

<style scoped>
.pagination-container {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
  padding: 16px 0 0;
}

@media (max-width: 640px) {
  .pagination-container {
    justify-content: center;
  }

  .pagination-total {
    flex: 1 0 100%;
    text-align: center;
  }

  .page-jumper {
    display: none;
  }
}

.pagination-total {
  color: var(--muted-foreground);
  font-size: 13px;
}

:deep(.page-size-select) {
  width: 104px;
}

.page-jumper {
  width: 64px;
}
</style>

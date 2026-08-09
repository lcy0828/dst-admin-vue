<template>
  <div v-if="!hidden && total > 0" class="pagination-container">
    <span class="pagination-total">{{ $t('common.pagination.total', { count: total }) }}</span>
    <NativeSelect v-model="pageSize" :aria-label="$t('common.pagination.pageSize')" class="page-size-select" @change="handleSizeChange(pageSize)">
      <NativeSelectOption v-for="size in pageSizes" :key="size" :value="size">
        {{ $t('common.pagination.perPage', { count: size }) }}
      </NativeSelectOption>
    </NativeSelect>
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
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Pagination as ShadcnPagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination'

export default {
  name: 'AppPagination',
  components: {
    ChevronLeftIcon,
    ChevronRightIcon,
    UiInput,
    NativeSelect,
    NativeSelectOption,
    ShadcnPagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationNext,
    PaginationPrevious
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

.page-size-select {
  width: 104px;
}

.page-jumper {
  width: 64px;
}
</style>

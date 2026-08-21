<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  ChevronRight,
  Gamepad2,
  KeyRound,
  LogOut,
  UserRound
} from '@lucide/vue'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail
} from '@/components/ui/sidebar'
import { navigationForFeatures } from '@/v2/navigation'

const props = defineProps({
  systemName: { type: String, default: '' },
  user: { type: Object, default: () => ({}) },
  features: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['profile', 'password', 'logout'])
const route = useRoute()
const { t } = useI18n()

const displaySystemName = computed(() => props.systemName?.trim() || t('app.defaultName'))
const userInitial = computed(() => (props.user.username || t('app.administrator')).trim().slice(0, 1).toUpperCase())
const navigationSections = computed(() => navigationForFeatures(props.features))

function isActive(path) {
  if (path === '/dashboard') return route.path === path
  return route.path === path || route.path.startsWith(`${path}/`)
}

function isGroupActive(item) {
  const firstChildPath = item.children?.[0]?.to
  if (!firstChildPath) return false
  const groupPath = firstChildPath.slice(0, firstChildPath.lastIndexOf('/'))
  return route.path === groupPath || route.path.startsWith(`${groupPath}/`)
}
</script>

<template>
  <Sidebar collapsible="icon">
    <SidebarHeader class="p-3">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" as-child :tooltip="t('navigation.dashboard')">
            <RouterLink to="/dashboard">
              <span class="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-md">
                <Gamepad2 />
              </span>
              <span class="grid min-w-0 flex-1 text-left leading-tight">
                <span class="truncate font-semibold">{{ displaySystemName }}</span>
                <span class="text-muted-foreground truncate text-xs">{{ t('app.consoleName') }}</span>
              </span>
            </RouterLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>

    <SidebarContent>
      <SidebarGroup v-for="section in navigationSections" :key="section.labelKey">
        <SidebarGroupLabel>{{ t(section.labelKey) }}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <template v-for="item in section.items" :key="item.labelKey">
              <SidebarMenuItem v-if="!item.children">
                <SidebarMenuButton as-child :tooltip="t(item.labelKey)" :is-active="isActive(item.to)">
                  <RouterLink :to="item.to">
                    <component :is="item.icon" />
                    <span>{{ t(item.labelKey) }}</span>
                  </RouterLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <Collapsible v-else as-child :default-open="isGroupActive(item)" class="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger as-child>
                    <SidebarMenuButton :tooltip="t(item.labelKey)" :is-active="isGroupActive(item)">
                      <component :is="item.icon" />
                      <span>{{ t(item.labelKey) }}</span>
                      <ChevronRight class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem v-for="child in item.children" :key="child.to">
                        <SidebarMenuSubButton as-child :is-active="isActive(child.to)">
                          <RouterLink :to="child.to"><span>{{ t(child.labelKey) }}</span></RouterLink>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </template>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <SidebarFooter class="p-3">
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <SidebarMenuButton size="lg" :tooltip="t('app.accountMenu')">
                <Avatar class="size-8 rounded-md">
                  <AvatarFallback class="rounded-md">{{ userInitial }}</AvatarFallback>
                </Avatar>
                <span class="grid min-w-0 flex-1 text-left leading-tight">
                  <span class="truncate font-medium">{{ user.username || t('app.administrator') }}</span>
                  <span class="text-muted-foreground truncate text-xs">{{ t('app.systemAdministrator') }}</span>
                </span>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" class="w-56">
              <DropdownMenuLabel>{{ user.username || t('app.administrator') }}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem @select="emit('profile')"><UserRound />{{ t('app.profile') }}</DropdownMenuItem>
                <DropdownMenuItem @select="emit('password')"><KeyRound />{{ t('app.changePassword') }}</DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem variant="destructive" @select="emit('logout')"><LogOut />{{ t('app.logout') }}</DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  ChevronRight,
  Gamepad2,
  KeyRound,
  LogOut,
  UserRound
} from '@lucide/vue'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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
import { V2_NAVIGATION } from '@/v2/navigation'

const props = defineProps({
  systemName: { type: String, default: '饥荒管理系统' },
  user: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['profile', 'password', 'logout'])
const route = useRoute()

const userInitial = computed(() => (props.user.username || '管').trim().slice(0, 1).toUpperCase())

function isActive(path) {
  if (path === '/preview-v2') return route.path === path
  return route.path === path || route.path.startsWith(`${path}/`)
}

function isGroupActive(item) {
  return item.children?.some(child => isActive(child.to)) || false
}
</script>

<template>
  <Sidebar collapsible="icon">
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" as-child tooltip="服务总览">
            <RouterLink to="/preview-v2">
              <span class="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
                <Gamepad2 />
              </span>
              <span class="grid min-w-0 flex-1 text-left leading-tight">
                <span class="truncate font-semibold">{{ systemName }}</span>
                <span class="text-muted-foreground truncate text-xs">DST Server Console</span>
              </span>
              <Badge variant="outline" class="group-data-[collapsible=icon]:hidden">V2</Badge>
            </RouterLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>

    <SidebarContent>
      <SidebarGroup v-for="section in V2_NAVIGATION" :key="section.label">
        <SidebarGroupLabel>{{ section.label }}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <template v-for="item in section.items" :key="item.label">
              <SidebarMenuItem v-if="!item.children">
                <SidebarMenuButton as-child :tooltip="item.label" :is-active="isActive(item.to)">
                  <RouterLink :to="item.to">
                    <component :is="item.icon" />
                    <span>{{ item.label }}</span>
                  </RouterLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <Collapsible v-else as-child :default-open="isGroupActive(item)" class="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger as-child>
                    <SidebarMenuButton :tooltip="item.label" :is-active="isGroupActive(item)">
                      <component :is="item.icon" />
                      <span>{{ item.label }}</span>
                      <ChevronRight class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem v-for="child in item.children" :key="child.to">
                        <SidebarMenuSubButton as-child :is-active="isActive(child.to)">
                          <RouterLink :to="child.to"><span>{{ child.label }}</span></RouterLink>
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

    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <SidebarMenuButton size="lg" tooltip="账户菜单">
                <Avatar class="size-8 rounded-md">
                  <AvatarFallback class="rounded-md">{{ userInitial }}</AvatarFallback>
                </Avatar>
                <span class="grid min-w-0 flex-1 text-left leading-tight">
                  <span class="truncate font-medium">{{ user.username || '管理员' }}</span>
                  <span class="text-muted-foreground truncate text-xs">系统管理员</span>
                </span>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" class="w-56">
              <DropdownMenuLabel>{{ user.username || '管理员' }}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem @select="emit('profile')"><UserRound />个人资料</DropdownMenuItem>
                <DropdownMenuItem @select="emit('password')"><KeyRound />修改密码</DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem variant="destructive" @select="emit('logout')"><LogOut />退出登录</DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
</template>

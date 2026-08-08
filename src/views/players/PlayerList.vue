<template>
  <div class="player-list-page">
    <div class="page-header">
      <div class="title-container"><Users /><h1>玩家列表</h1></div>
      <div class="action-buttons">
        <UiButton size="sm" variant="outline" @click="refreshData" :disabled="loading"><RefreshCw data-icon="inline-start" />刷新</UiButton>
        <UiButton size="sm" variant="outline" @click="showUpdateDialog"><Upload data-icon="inline-start" />手动更新</UiButton>
        <UiButton size="sm" variant="outline" @click="showSessionSelect"><Globe2 data-icon="inline-start" />选择游戏世界</UiButton>
        <UiButton size="sm" @click="showScheduleDialog"><Clock3 data-icon="inline-start" />添加定时任务</UiButton>
        <Badge v-if="activeSessionName">当前世界: {{ activeSessionLabel }}</Badge>
      </div>
    </div>

    <Card class="filter-card">
      <CardContent>
        <FieldGroup class="filter-form">
          <Field>
            <FieldLabel for="player-archive-filter">存档名称</FieldLabel>
            <NativeSelect id="player-archive-filter" v-model="filterForm.archive_name" @change="handleFilter">
              <NativeSelectOption value="">全部存档</NativeSelectOption>
              <NativeSelectOption v-for="archive in archiveOptions" :key="archive.value" :value="archive.value">{{ archive.label }}</NativeSelectOption>
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel for="player-status-filter">玩家状态</FieldLabel>
            <NativeSelect id="player-status-filter" v-model="filterForm.status" @change="handleFilter">
              <NativeSelectOption value="">全部状态</NativeSelectOption><NativeSelectOption value="online">在线</NativeSelectOption><NativeSelectOption value="offline">离线</NativeSelectOption>
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel for="player-character-filter">角色</FieldLabel>
            <NativeSelect id="player-character-filter" v-model="filterForm.prefab" @change="handleFilter">
              <NativeSelectOption value="">全部角色</NativeSelectOption>
              <NativeSelectOption v-for="character in characterOptions" :key="character.value" :value="character.value">{{ character.label }}</NativeSelectOption>
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel for="player-keyword-filter">关键词</FieldLabel>
            <InputGroup><InputGroupAddon><Search /></InputGroupAddon><InputGroupInput id="player-keyword-filter" v-model="filterForm.keyword" placeholder="搜索玩家名称或 ID" @keyup.enter="handleFilter" /></InputGroup>
          </Field>
          <div class="filter-actions"><UiButton @click="handleFilter"><Search data-icon="inline-start" />搜索</UiButton><UiButton variant="outline" @click="resetFilter">重置</UiButton></div>
        </FieldGroup>
      </CardContent>
    </Card>

    <Card class="table-card">
      <CardHeader class="table-operations">
        <div><CardTitle>玩家列表</CardTitle><CardDescription>共 {{ pagination.total }} 名玩家</CardDescription></div>
        <UiButton size="sm" @click="exportPlayerData"><Download data-icon="inline-start" />导出数据</UiButton>
      </CardHeader>
      <CardContent>
        <div v-if="loading" class="loading-state"><Spinner /><span>正在加载玩家列表</span></div>
        <div v-else-if="playerList.length > 0" class="table-wrap">
          <UiTable>
            <TableHeader>
              <TableRow>
                <TableHead><SortButton label="ID" field="id" :active-field="sortParams.prop" :order="sortParams.order" @sort="toggleSort" /></TableHead>
                <TableHead><SortButton label="存档名称" field="archive_name" :active-field="sortParams.prop" :order="sortParams.order" @sort="toggleSort" /></TableHead>
                <TableHead>玩家名称</TableHead>
                <TableHead>KU ID</TableHead>
                <TableHead>角色</TableHead>
                <TableHead><SortButton label="天数" field="player_age" :active-field="sortParams.prop" :order="sortParams.order" @sort="toggleSort" /></TableHead>
                <TableHead><SortButton label="状态" field="status" :active-field="sortParams.prop" :order="sortParams.order" @sort="toggleSort" /></TableHead>
                <TableHead>网络质量</TableHead>
                <TableHead>性能</TableHead>
                <TableHead>Steam ID</TableHead>
                <TableHead><SortButton label="首次登录" field="first_seen" :active-field="sortParams.prop" :order="sortParams.order" @sort="toggleSort" /></TableHead>
                <TableHead><SortButton label="最后登录" field="last_seen" :active-field="sortParams.prop" :order="sortParams.order" @sort="toggleSort" /></TableHead>
                <TableHead class="action-column">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="player in playerList" :key="player.id">
                <TableCell>{{ player.id }}</TableCell>
                <TableCell>{{ player.archive_name }}</TableCell>
                <TableCell>
                  <div class="player-name-cell"><span class="truncate">{{ player.player_name }}</span><Crown v-if="player.is_admin" title="管理员" /><UserRoundCheck v-if="player.is_friend" title="好友" /></div>
                </TableCell>
                <TableCell class="mono-cell">{{ player.user_id }}</TableCell>
                <TableCell><Badge variant="outline">{{ getCharacterName(player.prefab) }}</Badge></TableCell>
                <TableCell>{{ player.player_age }}</TableCell>
                <TableCell><Badge :variant="player.status === 'online' ? 'default' : 'secondary'">{{ player.status === 'online' ? '在线' : '离线' }}</Badge></TableCell>
                <TableCell><Badge v-if="player.status === 'online'" :variant="getNetworkBadgeVariant(player.net_score)">{{ getNetworkQuality(player.net_score) }}</Badge><span v-else>-</span></TableCell>
                <TableCell><Badge :variant="getPerformanceBadgeVariant(player.performance)">{{ getPerformanceText(player.performance) }}</Badge></TableCell>
                <TableCell>
                  <div class="steam-actions"><UiButton variant="ghost" size="sm" @click="copySteamID(player.net_id)">{{ formatSteamID(player.net_id) }}</UiButton><UiButton variant="ghost" size="icon-xs" title="在 Steam 中查看" aria-label="在 Steam 中查看玩家" @click="openSteamProfile(player.net_id)"><ExternalLink /></UiButton></div>
                </TableCell>
                <TableCell>{{ formatDate(player.first_seen) }}</TableCell>
                <TableCell>{{ formatDate(player.last_seen) }}</TableCell>
                <TableCell class="action-column">
                  <div class="row-actions">
                    <UiButton variant="ghost" size="sm" @click="viewPlayerDetail(player)">详情</UiButton>
                    <DropdownMenu>
                      <DropdownMenuTrigger as-child><UiButton variant="ghost" size="icon-sm" aria-label="打开玩家操作菜单" title="玩家操作"><MoreHorizontal /></UiButton></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuGroup>
                          <DropdownMenuItem @select="toggleGodMode(player)">无敌模式</DropdownMenuItem>
                          <DropdownMenuItem @select="toggleCreativeMode(player)">制作模式</DropdownMenuItem>
                          <DropdownMenuItem @select="resurrectPlayer(player)">复活玩家</DropdownMenuItem>
                          <DropdownMenuItem @select="changeCharacter(player)">重选人物</DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                          <DropdownMenuItem variant="destructive" @select="kickPlayer(player)">踢出玩家</DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" @select="banPlayer(player)">封禁玩家</DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" @select="killPlayer(player)">杀死玩家</DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </UiTable>
        </div>
        <Empty v-else><EmptyHeader><EmptyMedia variant="icon"><Users /></EmptyMedia><EmptyTitle>暂无玩家数据</EmptyTitle><EmptyDescription>选择存档或手动更新玩家列表。</EmptyDescription></EmptyHeader></Empty>

        <div class="pagination-bar">
          <span>每页</span>
          <NativeSelect :model-value="String(pagination.page_size)" @update:model-value="value => handleSizeChange(Number(value))">
            <NativeSelectOption value="10">10</NativeSelectOption><NativeSelectOption value="20">20</NativeSelectOption><NativeSelectOption value="50">50</NativeSelectOption><NativeSelectOption value="100">100</NativeSelectOption>
          </NativeSelect>
          <Pagination :page="pagination.page" :total="pagination.total" :items-per-page="pagination.page_size" show-edges @update:page="handleCurrentChange">
            <PaginationContent v-slot="{ items }">
              <PaginationPrevious />
              <template v-for="(item, index) in items" :key="index">
                <PaginationItem v-if="item.type === 'page'" :value="item.value" :is-active="item.value === pagination.page">{{ item.value }}</PaginationItem>
                <PaginationEllipsis v-else :index="index" />
              </template>
              <PaginationNext />
            </PaginationContent>
          </Pagination>
        </div>
      </CardContent>
    </Card>

    <Sheet v-model:open="playerDetailVisible">
      <SheetContent side="right" class="player-detail-sheet">
        <SheetHeader><SheetTitle>玩家详情</SheetTitle><SheetDescription>身份、连接状态和服务器操作。</SheetDescription></SheetHeader>
        <ScrollArea class="player-detail-scroll">
          <div v-if="currentPlayer" class="player-detail">
            <div class="player-detail-heading">
              <Avatar size="lg"><AvatarFallback>{{ getPlayerInitials(currentPlayer) }}</AvatarFallback></Avatar>
              <div><div class="detail-player-name"><strong>{{ currentPlayer.player_name || currentPlayer.user_id }}</strong><Badge :variant="currentPlayer.status === 'online' ? 'default' : 'secondary'">{{ currentPlayer.status === 'online' ? '在线' : '离线' }}</Badge></div><span>{{ getCharacterName(currentPlayer.prefab) }} · {{ currentPlayer.archive_name }} / {{ currentPlayer.world_name || '未知世界' }}</span></div>
            </div>
            <dl class="player-description-grid">
              <div><dt>玩家 ID</dt><dd>{{ currentPlayer.id }}</dd></div><div><dt>KU ID</dt><dd>{{ currentPlayer.user_id }}</dd></div>
              <div><dt>玩家名称</dt><dd>{{ currentPlayer.player_name }}</dd></div><div><dt>存档名称</dt><dd>{{ currentPlayer.archive_name }}</dd></div>
              <div><dt>角色</dt><dd>{{ getCharacterName(currentPlayer.prefab) }}</dd></div><div><dt>天数</dt><dd>{{ currentPlayer.player_age }}</dd></div>
              <div><dt>状态变更</dt><dd>{{ formatDate(currentPlayer.status_change) }}</dd></div><div><dt>Steam ID</dt><dd><UiButton variant="link" size="sm" @click="copySteamID(currentPlayer.net_id)">{{ currentPlayer.net_id }}</UiButton></dd></div>
              <div><dt>网络质量</dt><dd>{{ currentPlayer.status === 'online' ? getNetworkQuality(currentPlayer.net_score) : '-' }}</dd></div><div><dt>性能指标</dt><dd>{{ getPerformanceText(currentPlayer.performance) }}</dd></div>
              <div><dt>首次登录</dt><dd>{{ formatDate(currentPlayer.first_seen) }}</dd></div><div><dt>最后登录</dt><dd>{{ formatDate(currentPlayer.last_seen) }}</dd></div>
              <div><dt>创建时间</dt><dd>{{ formatDate(currentPlayer.created_at) }}</dd></div><div><dt>更新时间</dt><dd>{{ formatDate(currentPlayer.updated_at) }}</dd></div>
            </dl>
            <Separator />
            <section><h3>游戏操作</h3><div class="detail-action-grid">
              <UiButton size="sm" variant="outline" @click="toggleGodMode(currentPlayer)">无敌模式</UiButton><UiButton size="sm" variant="outline" @click="toggleCreativeMode(currentPlayer)">制作模式</UiButton><UiButton size="sm" variant="outline" @click="resurrectPlayer(currentPlayer)">复活玩家</UiButton><UiButton size="sm" variant="outline" @click="changeCharacter(currentPlayer)">重选人物</UiButton>
            </div></section>
            <section><h3>危险操作</h3><div class="detail-action-grid">
              <UiButton variant="destructive" size="sm" @click="kickPlayer(currentPlayer)">踢出</UiButton><UiButton variant="destructive" size="sm" @click="banPlayer(currentPlayer)">封禁</UiButton><UiButton variant="destructive" size="sm" @click="killPlayer(currentPlayer)">杀死</UiButton>
            </div></section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>

    <UiDialog v-model:open="banDialogVisible">
      <DialogContent><DialogHeader><DialogTitle>封禁玩家</DialogTitle><DialogDescription>{{ currentPlayer?.player_name || '' }}</DialogDescription></DialogHeader>
        <FieldGroup><Field :data-invalid="Boolean(banFormError)"><FieldLabel for="ban-reason">封禁原因</FieldLabel><UiTextarea id="ban-reason" v-model="banForm.reason" rows="3" placeholder="请输入封禁原因" :aria-invalid="Boolean(banFormError)" /><FieldError v-if="banFormError">{{ banFormError }}</FieldError></Field>
          <Field><FieldLabel>封禁时长</FieldLabel><UiSelect v-model="banForm.duration"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="duration in banDurations" :key="duration.value" :value="duration.value">{{ duration.label }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field></FieldGroup>
        <DialogFooter><UiButton variant="outline" @click="banDialogVisible = false">取消</UiButton><UiButton variant="destructive" @click="confirmBanPlayer" :disabled="banning"><Spinner v-if="banning" data-icon="inline-start" />确认封禁</UiButton></DialogFooter>
      </DialogContent>
    </UiDialog>

    <UiDialog v-model:open="godModeDialogVisible">
      <DialogContent><DialogHeader><DialogTitle>设置无敌模式</DialogTitle><DialogDescription>玩家 {{ currentPlayer?.player_name || '' }}</DialogDescription></DialogHeader>
        <Field orientation="horizontal"><FieldContent><FieldLabel for="god-mode-enabled">无敌模式</FieldLabel><FieldDescription>{{ godModeForm.enabled ? '开启' : '关闭' }}</FieldDescription></FieldContent><UiSwitch id="god-mode-enabled" v-model="godModeForm.enabled" /></Field>
        <DialogFooter><UiButton variant="outline" @click="godModeDialogVisible = false">取消</UiButton><UiButton @click="confirmGodMode" :disabled="settingGodMode"><Spinner v-if="settingGodMode" data-icon="inline-start" />确认</UiButton></DialogFooter>
      </DialogContent>
    </UiDialog>

    <UiDialog v-model:open="creativeModeDialogVisible">
      <DialogContent><DialogHeader><DialogTitle>设置制作模式</DialogTitle><DialogDescription>玩家 {{ currentPlayer?.player_name || '' }}</DialogDescription></DialogHeader>
        <Field orientation="horizontal"><FieldContent><FieldLabel for="creative-mode-enabled">制作模式</FieldLabel><FieldDescription>{{ creativeModeForm.enabled ? '开启' : '关闭' }}</FieldDescription></FieldContent><UiSwitch id="creative-mode-enabled" v-model="creativeModeForm.enabled" /></Field>
        <DialogFooter><UiButton variant="outline" @click="creativeModeDialogVisible = false">取消</UiButton><UiButton @click="confirmCreativeMode" :disabled="settingCreativeMode"><Spinner v-if="settingCreativeMode" data-icon="inline-start" />确认</UiButton></DialogFooter>
      </DialogContent>
    </UiDialog>

    <UiDialog v-model:open="sessionSelectDialogVisible">
      <DialogContent><DialogHeader><DialogTitle>选择游戏世界</DialogTitle><DialogDescription>玩家操作将在选中的世界执行。</DialogDescription></DialogHeader>
        <FieldGroup><Field><FieldLabel>游戏世界</FieldLabel><UiSelect v-model="selectedSessionName"><SelectTrigger><SelectValue placeholder="选择世界" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="session in sessionList" :key="session.key" :value="session.key">{{ session.name }} · {{ session.state }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field></FieldGroup>
        <Alert v-if="sessionList.length === 0" variant="destructive"><TriangleAlert /><AlertTitle>没有可用的世界</AlertTitle></Alert>
        <DialogFooter><UiButton variant="outline" @click="sessionSelectDialogVisible = false">取消</UiButton><UiButton @click="confirmSessionSelect">确认</UiButton></DialogFooter>
      </DialogContent>
    </UiDialog>

    <UiDialog v-model:open="updateDialogVisible">
      <DialogContent><DialogHeader><DialogTitle>手动更新玩家列表</DialogTitle><DialogDescription>从服务器读取最新的真实玩家信息。</DialogDescription></DialogHeader>
        <FieldGroup><Field><FieldLabel>存档名称</FieldLabel><UiSelect v-model="updateForm.archive_name" @update:model-value="onArchiveChange"><SelectTrigger><SelectValue placeholder="选择存档" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="archive in archiveOptions" :key="archive.value" :value="archive.value">{{ archive.label }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
          <Field><FieldLabel for="update-world">世界名称</FieldLabel><NativeSelect id="update-world" v-model="updateForm.world_name"><NativeSelectOption value="">所有世界</NativeSelectOption><NativeSelectOption v-for="world in worldOptions" :key="world.value" :value="world.value">{{ world.label }}</NativeSelectOption></NativeSelect><FieldDescription>留空表示所有世界。</FieldDescription></Field></FieldGroup>
        <DialogFooter><UiButton variant="outline" @click="updateDialogVisible = false">取消</UiButton><UiButton @click="confirmUpdate" :disabled="updating || !updateForm.archive_name"><Spinner v-if="updating" data-icon="inline-start" />开始更新</UiButton></DialogFooter>
      </DialogContent>
    </UiDialog>

    <UiDialog v-model:open="characterDialogVisible">
      <DialogContent><DialogHeader><DialogTitle>重选人物</DialogTitle><DialogDescription>玩家 {{ currentPlayer?.player_name || '' }} 当前角色为 {{ currentPlayer ? getCharacterName(currentPlayer.prefab) : '' }}。</DialogDescription></DialogHeader>
        <Alert variant="destructive"><TriangleAlert /><AlertTitle>玩家数据会被重置</AlertTitle><AlertDescription>完成后玩家可以重新选择角色。</AlertDescription></Alert>
        <DialogFooter><UiButton variant="outline" @click="characterDialogVisible = false">取消</UiButton><UiButton @click="confirmChangeCharacter" :disabled="changingCharacter"><Spinner v-if="changingCharacter" data-icon="inline-start" />确认重选</UiButton></DialogFooter>
      </DialogContent>
    </UiDialog>

    <UiDialog v-model:open="scheduleDialogVisible">
      <DialogContent class="max-w-2xl"><DialogHeader><DialogTitle>添加定时更新任务</DialogTitle><DialogDescription>定期从选中世界同步玩家列表。</DialogDescription></DialogHeader>
        <FieldGroup>
          <Field :data-invalid="Boolean(scheduleErrors.name)"><FieldLabel for="schedule-name">任务名称</FieldLabel><UiInput id="schedule-name" v-model="scheduleForm.name" :aria-invalid="Boolean(scheduleErrors.name)" /><FieldError v-if="scheduleErrors.name">{{ scheduleErrors.name }}</FieldError></Field>
          <Field :data-invalid="Boolean(scheduleErrors.session_name)"><FieldLabel>游戏世界</FieldLabel><UiSelect v-model="scheduleForm.session_name"><SelectTrigger :aria-invalid="Boolean(scheduleErrors.session_name)"><SelectValue placeholder="选择游戏世界" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="session in sessionList" :key="session.key" :value="session.key">{{ session.name }} · {{ session.state }}</SelectItem></SelectGroup></SelectContent></UiSelect><FieldError v-if="scheduleErrors.session_name">{{ scheduleErrors.session_name }}</FieldError></Field>
          <Field :data-invalid="Boolean(scheduleErrors.spec)"><FieldLabel for="schedule-spec">执行计划</FieldLabel><UiInput id="schedule-spec" v-model="scheduleForm.spec" placeholder="例如：0 */3 * * * *" :aria-invalid="Boolean(scheduleErrors.spec)" /><FieldDescription>支持五段 Cron，或以 0 秒开头的六段 Cron。</FieldDescription><FieldError v-if="scheduleErrors.spec">{{ scheduleErrors.spec }}</FieldError></Field>
          <Field><FieldLabel for="schedule-description">任务描述</FieldLabel><UiTextarea id="schedule-description" v-model="scheduleForm.description" rows="2" /></Field>
        </FieldGroup>
        <DialogFooter><UiButton variant="outline" @click="scheduleDialogVisible = false">取消</UiButton><UiButton @click="confirmAddSchedule" :disabled="addingSchedule"><Spinner v-if="addingSchedule" data-icon="inline-start" />确认添加</UiButton></DialogFooter>
      </DialogContent>
    </UiDialog>
  </div>
</template>

<script>
import { Clock3, Crown, Download, ExternalLink, Globe2, MoreHorizontal, RefreshCw, Search, TriangleAlert, Upload, UserRoundCheck, Users } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { playerApi } from '@/api/playerApi';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input as UiInput } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { Switch as UiSwitch } from '@/components/ui/switch';
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea as UiTextarea } from '@/components/ui/textarea';
import { confirmAction } from '@/lib/feedback';
import SortButton from './SortButton.vue';

export default {
  name: 'PlayerList',
  components: {
    Alert,
    AlertDescription,
    AlertTitle,
    Avatar,
    AvatarFallback,
    Badge,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Clock3,
    Crown,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Download,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    ExternalLink,
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    Globe2,
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
    MoreHorizontal,
    NativeSelect,
    NativeSelectOption,
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationNext,
    PaginationPrevious,
    RefreshCw,
    ScrollArea,
    Search,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Separator,
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SortButton,
    Spinner,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TriangleAlert,
    UiButton,
    UiDialog,
    UiInput,
    UiSelect,
    UiSwitch,
    UiTable,
    UiTextarea,
    Upload,
    UserRoundCheck,
    Users
  },
  data() {
    return {
      // 玩家列表数据
      playerList: [],
      loading: false,

      // 分页参数
      pagination: {
        page: 1,
        page_size: 10,
        total: 0
      },

      // 筛选表单
      filterForm: {
        archive_name: this.$route.query.archive || '',
        status: '',
        prefab: '',
        keyword: ''
      },

      // 存档选项
      archiveOptions: [],

      // 角色选项
      characterOptions: [
        { label: '威尔逊', value: 'wilson' },
        { label: '薇洛', value: 'willow' },
        { label: '沃尔夫冈', value: 'wolfgang' },
        { label: '温蒂', value: 'wendy' },
        { label: 'WX-78', value: 'wx78' },
        { label: '薇克巴顿', value: 'wickerbottom' },
        { label: '伍迪', value: 'woodie' },
        { label: '韦斯', value: 'wes' },
        { label: '麦斯威尔', value: 'waxwell' },
        { label: '薇格弗德', value: 'wathgrithr' },
        { label: '韦伯', value: 'webber' },
        { label: '薇诺娜', value: 'winona' },
        { label: '沃利', value: 'warly' },
        { label: '沃尔特', value: 'walter' },
        { label: '沃拓克斯', value: 'wortox' },
        { label: '沃姆伍德', value: 'wormwood' },
        { label: '沃特', value: 'wurt' },
        { label: '旺达', value: 'wanda' },
        { label: '芜猴', value: 'wonkey' }
      ],

      // 排序参数
      sortParams: {
        prop: 'last_seen',
        order: 'descending'
      },

      // 玩家详情
      playerDetailVisible: false,
      currentPlayer: null,



      // 封禁
      banDialogVisible: false,
      banForm: {
        reason: '',
        duration: '1d'
      },
      banFormError: '',
      banDurations: [
        { label: '1小时', value: '1h' },
        { label: '6小时', value: '6h' },
        { label: '12小时', value: '12h' },
        { label: '1天', value: '1d' },
        { label: '3天', value: '3d' },
        { label: '7天', value: '7d' },
        { label: '30天', value: '30d' },
        { label: '永久', value: 'permanent' }
      ],
      banning: false,

      // 会话列表
      sessionList: [],
      updateDialogVisible: false,
      updateForm: {
        archive_name: '',
        world_name: ''
      },
      worldOptions: [],
      updating: false,

      // 无敌模式
      godModeDialogVisible: false,
      godModeForm: {
        enabled: true
      },
      settingGodMode: false,

      // 制作模式
      creativeModeDialogVisible: false,
      creativeModeForm: {
        enabled: true
      },
      settingCreativeMode: false,

      // 重选人物
      characterDialogVisible: false,
      changingCharacter: false,

      // 定时更新任务
      scheduleDialogVisible: false,
      addingSchedule: false,
      scheduleForm: {
        name: '',
        description: '',
        session_name: '',
        spec: '0 */3 * * * *' // 默认每3分钟执行一次
      },
      scheduleErrors: {},

      // 会话选择
      selectedSessionName: '',
      sessionSelectDialogVisible: false
    };
  },
  created() {
    this.fetchArchives();
    this.fetchSessions();
    this.fetchPlayerList();
  },

  computed: {
    // 获取默认的会话名称（Forest1）
    defaultSessionName() {
      if (this.sessionList && this.sessionList.length > 0) {
        // 优先使用包含Forest并且序号为1的会话
        const forestSession = this.sessionList.find(session =>
          session.name.includes('Forest') && session.name.endsWith('1'));

        if (forestSession) {
          return forestSession.key;
        }

        // 如果没有找到Forest1，则使用第一个包含Forest的会话
        const anyForestSession = this.sessionList.find(session => session.name.includes('Forest'));
        if (anyForestSession) {
          return anyForestSession.key;
        }

        // 如果没有包含Forest的会话，使用第一个会话
        return this.sessionList[0].key;
      }
      return '';
    },

    // 当前选中的会话名称
    activeSessionName() {
      return this.selectedSessionName || this.defaultSessionName;
    },

    activeSessionLabel() {
      const session = this.sessionList.find(item => item.key === this.activeSessionName);
      return session ? session.name : '';
    }
  },
  methods: {
    handlePlayerCommand(command) {
      if (!command?.player) return;
      const actions = {
        god: this.toggleGodMode,
        creative: this.toggleCreativeMode,
        resurrect: this.resurrectPlayer,
        character: this.changeCharacter,
        kick: this.kickPlayer,
        ban: this.banPlayer,
        kill: this.killPlayer
      };
      actions[command.action]?.call(this, command.player);
    },
    // 获取玩家列表
    fetchPlayerList() {
      this.loading = true;

      const params = {
        page: this.pagination.page,
        page_size: this.pagination.page_size,
        ...this.filterForm
      };

      // 添加排序参数
      if (this.sortParams.prop && this.sortParams.order) {
        params.sort_by = this.sortParams.prop;
        params.sort_order = this.sortParams.order === 'ascending' ? 'asc' : 'desc';
      }

      playerApi.getAllPlayers(params)
        .then(response => {
          this.playerList = response.data || [];
          this.pagination.total = response.total || 0;
        })
        .catch(error => {
          console.error('获取玩家列表失败:', error);
          this.playerList = [];
          this.pagination.total = 0;
          toast.error(`获取玩家列表失败: ${error.message || '未知错误'}`);
        })
        .finally(() => {
          this.loading = false;
        });
    },

    // 刷新数据
    refreshData() {
      this.fetchPlayerList();
    },

    // 处理筛选
    handleFilter() {
      this.pagination.page = 1;
      this.fetchPlayerList();
    },

    // 重置筛选
    resetFilter() {
      this.filterForm = {
        archive_name: '',
        status: '',
        prefab: '',
        keyword: ''
      };
      this.handleFilter();
    },

    toggleSort(field) {
      const isCurrentField = this.sortParams.prop === field;
      this.sortParams.prop = field;
      this.sortParams.order = isCurrentField && this.sortParams.order === 'ascending'
        ? 'descending'
        : 'ascending';
      this.fetchPlayerList();
    },

    // 处理页码变化
    handleCurrentChange(page) {
      this.pagination.page = page;
      this.fetchPlayerList();
    },

    // 处理每页数量变化
    handleSizeChange(size) {
      this.pagination.page_size = size;
      this.pagination.page = 1;
      this.fetchPlayerList();
    },

    // 查看玩家详情
    viewPlayerDetail(player) {
      this.currentPlayer = { ...player };
      this.playerDetailVisible = true;
    },

    // 踢出玩家
    async kickPlayer(player) {
      try {
        await confirmAction(`确定要踢出玩家 ${player.player_name} 吗？`, '踢出玩家', { destructive: true });
      } catch {
        return;
      }

      const loadingId = toast.loading('正在踢出玩家...');
      try {
        await playerApi.kickPlayer(player, this.activeSessionName);
        toast.success(`已踢出玩家 ${player.player_name}`);
        this.playerDetailVisible = false;
        this.refreshData();
      } catch (error) {
        console.error('踢出玩家失败:', error);
        toast.error(`踢出玩家失败: ${error.message || '未知错误'}`);
      } finally {
        toast.dismiss(loadingId);
      }
    },

    // 封禁玩家
    banPlayer(player) {
      this.currentPlayer = player;
      this.banForm = {
        reason: '',
        duration: '1d'
      };
      this.banFormError = '';
      this.banDialogVisible = true;
    },

    // 确认封禁玩家
    confirmBanPlayer() {
      const reason = this.banForm.reason.trim();
      if (!reason) {
        this.banFormError = '请输入封禁原因';
        return;
      }
      this.banFormError = '';

      this.banning = true;

      const banData = {
        reason,
        duration: this.banForm.duration,
        archive_name: this.activeSessionName
      };

      playerApi.banPlayer(this.currentPlayer, banData)
        .then(() => {
          toast.success(`已封禁玩家 ${this.currentPlayer.player_name}`);
          this.banDialogVisible = false;
          this.playerDetailVisible = false;
          this.refreshData();
        })
        .catch(error => {
          console.error('封禁玩家失败:', error);
          toast.error(`封禁玩家失败: ${error.message || '未知错误'}`);
        })
        .finally(() => {
          this.banning = false;
        });
    },



    // 重选人物
    changeCharacter(player) {
      this.currentPlayer = player;
      this.characterDialogVisible = true;
    },

    // 确认重选人物
    async confirmChangeCharacter() {
      try {
        await confirmAction(
          `确定要让玩家 ${this.currentPlayer.player_name} 重选人物吗？该操作会重置玩家数据。`,
          '确认重选人物',
          { destructive: true }
        );
      } catch {
        return;
      }

      this.changingCharacter = true;
      try {
        const response = await playerApi.changeCharacter(this.currentPlayer, this.activeSessionName);
        if (!response || response.status !== 200) throw new Error(response?.msg || '命令执行失败');
        toast.success(`已重置玩家 ${this.currentPlayer.player_name}，玩家可以重新选择角色`);
        this.characterDialogVisible = false;
        this.playerDetailVisible = false;
        this.refreshData();
      } catch (error) {
        console.error('重选人物失败:', error);
        toast.error(`重选人物失败: ${error.message || '未知错误'}`);
      } finally {
        this.changingCharacter = false;
      }
    },

    // 显示定时更新对话框
    showScheduleDialog() {
      const sessionKey = this.activeSessionName;
      if (!sessionKey) {
        toast.warning('没有可用于定时更新的游戏世界');
        return;
      }
      const sessionName = this.activeSessionLabel;
      this.scheduleForm = {
        name: `自动更新玩家列表_${sessionName}`,
        description: `定时更新${sessionName}的玩家列表`,
        session_name: sessionKey,
        spec: '0 */3 * * * *' // 默认每3分钟执行一次
      };
      this.scheduleErrors = {};
      this.scheduleDialogVisible = true;
    },

    validateScheduleForm() {
      const errors = {};
      const name = this.scheduleForm.name.trim();
      const spec = this.scheduleForm.spec.trim();
      const cronFields = spec.split(/\s+/).filter(Boolean);

      if (!name) errors.name = '请输入任务名称';
      else if (name.length < 2 || name.length > 50) errors.name = '长度应在 2 到 50 个字符之间';
      if (!this.scheduleForm.session_name) errors.session_name = '请选择游戏世界';
      if (!spec) errors.spec = '请输入 Cron 表达式';
      else if (cronFields.length !== 5 && !(cronFields.length === 6 && cronFields[0] === '0')) {
        errors.spec = '请输入五段 Cron，或以 0 秒开头的六段 Cron';
      }

      this.scheduleErrors = errors;
      return Object.keys(errors).length === 0;
    },

    // 确认添加定时任务
    confirmAddSchedule() {
      if (!this.validateScheduleForm()) {
        toast.warning('请完善表单信息');
        return;
      }

      this.addingSchedule = true;
      const taskData = {
        name: this.scheduleForm.name.trim(),
        description: this.scheduleForm.description.trim(),
        spec: this.scheduleForm.spec.trim(),
        session_name: this.scheduleForm.session_name
      };

      playerApi.addRefreshSchedule(taskData)
        .then(response => {
          if (!response || response.status !== 200) {
            throw new Error(response?.msg || response?.message || '添加失败');
          }
          toast.success('定时更新任务添加成功');
          this.scheduleDialogVisible = false;
        })
        .catch(error => {
          console.error('添加定时任务失败:', error);
          toast.error(`添加定时任务失败: ${error.message || '未知错误'}`);
        })
        .finally(() => {
          this.addingSchedule = false;
        });
    },

    // 导出玩家数据
    exportPlayerData() {
      const loadingId = toast.loading('正在导出真实玩家数据...');
      const params = {
        ...this.filterForm,
        sort_by: this.sortParams.prop,
        sort_order: this.sortParams.order === 'ascending' ? 'asc' : 'desc'
      };
      playerApi.exportPlayers(params)
        .then(players => {
          const columns = [
            ['存档名称', 'archive_name'],
            ['世界名称', 'world_name'],
            ['KU ID', 'user_id'],
            ['玩家名称', 'player_name'],
            ['角色', 'prefab'],
            ['天数', 'player_age'],
            ['状态', 'status'],
            ['Steam ID', 'net_id'],
            ['首次登录', 'first_seen'],
            ['最后登录', 'last_seen']
          ];
          const escapeCell = value => {
            let text = value === null || value === undefined ? '' : String(value);
            if (/^[=+\-@]/.test(text)) text = `'${text}`;
            return `"${text.replace(/"/g, '""')}"`;
          };
          const rows = [
            columns.map(column => escapeCell(column[0])).join(','),
            ...players.map(player => columns.map(column => escapeCell(player[column[1]])).join(','))
          ];
          const blob = new Blob([`\ufeff${rows.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `玩家数据_${new Date().toISOString().slice(0, 10)}.csv`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          toast.success(`已导出 ${players.length} 条真实玩家数据`);
        })
        .catch(error => {
          console.error('导出玩家数据失败:', error);
          toast.error(`导出玩家数据失败: ${error.message || '未知错误'}`);
        })
        .finally(() => toast.dismiss(loadingId));
    },

    // 格式化日期
    formatDate(dateString) {
      if (!dateString) return '-';
      const date = new Date(dateString);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    },

    // 获取角色名称
    getCharacterName(prefab) {
      const character = this.characterOptions.find(c => c.value === prefab);
      return character ? character.label : prefab;
    },

    // 获取网络质量文本
    getNetworkQuality(netScore) {
      switch(netScore) {
        case 0: return '极佳';
        case 1: return '中等';
        case 2: return '很差';
        default: return '未知';
      }
    },

    getNetworkBadgeVariant(netScore) {
      if (netScore === 0) return 'default';
      if (netScore === 1) return 'secondary';
      if (netScore === 2) return 'destructive';
      return 'outline';
    },

    // 获取性能指标文本
    getPerformanceText(performance) {
      switch(performance) {
        case 0: return '性能良好';
        case 1: return '性能一般';
        case 2: return '性能差';
        default: return '未知';
      }
    },

    getPerformanceBadgeVariant(performance) {
      if (performance === 0) return 'default';
      if (performance === 1) return 'secondary';
      if (performance === 2) return 'destructive';
      return 'outline';
    },

    getPlayerInitials(player) {
      const name = (player?.player_name || player?.user_id || '?').trim();
      return Array.from(name).slice(0, 2).join('').toUpperCase();
    },

    // 从会话名称中提取世界名称
    extractWorldName(sessionName) {
      if (!sessionName) return '';

      // 移除前缀 'dstserver_'
      let worldName = sessionName.replace(/^dstserver_/, '');

      // 如果有存档名称，移除存档名称和下划线
      if (this.updateForm && this.updateForm.archive_name) {
        const archivePrefix = this.updateForm.archive_name + '_';
        worldName = worldName.replace(new RegExp('^' + archivePrefix), '');
      }

      return worldName;
    },

    // 生成世界名称选项
    generateWorldOptions() {
      if (!this.sessionList || this.sessionList.length === 0 || !this.updateForm.archive_name) {
        return [];
      }
      return this.sessionList
        .filter(session => session.room_id === this.updateForm.archive_name)
        .map(session => ({
          label: session.world_name,
          value: session.world_id
        }));
    },

    // 格式化 Steam ID
    formatSteamID(steamID) {
      if (!steamID) return '-';
      // 只显示前后几位，中间用省略号
      if (steamID.length > 8) {
        return steamID.substring(0, 4) + '...' + steamID.substring(steamID.length - 4);
      }
      return steamID;
    },

    // 复制 Steam ID
    async copySteamID(steamID) {
      if (!steamID) return;

      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(steamID);
        } else {
          const textArea = document.createElement('textarea');
          textArea.value = steamID;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.select();
          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);
          if (!successful) throw new Error('浏览器未允许复制');
        }
        toast.success('Steam ID 已复制到剪贴板');
      } catch (err) {
        toast.error(`复制失败: ${err.message || err}`);
      }
    },

    // 打开 Steam 个人资料页面
    openSteamProfile(steamID) {
      if (!steamID) return;
      const url = `https://steamcommunity.com/profiles/${steamID}`;
      window.open(url, '_blank');
    },

    // 获取存档列表
    fetchArchives() {
      playerApi.getArchives()
        .then(response => {
          if (response.data && Array.isArray(response.data)) {
            this.archiveOptions = response.data.map(archive => ({
              label: archive.name || archive.archive_name || archive,
              value: archive.id || archive.name || archive.archive_name || archive
            }));
          }
        })
        .catch(error => {
          console.error('获取存档列表失败:', error);
          this.archiveOptions = [];
          toast.error(`获取存档列表失败: ${error.message || '未知错误'}`);
        });
    },

    // 获取会话列表
    fetchSessions() {
      playerApi.getSessions()
        .then(response => {
          if (response.data && Array.isArray(response.data)) {
            this.sessionList = response.data;
            // 如果有运行中的会话，默认选择第一个
            if (this.sessionList.length > 0) {
              this.updateForm.session_name = this.sessionList[0].name;
              // 设置默认选中的会话
              this.selectedSessionName = this.defaultSessionName;
            }
          }
        })
        .catch(error => {
          console.error('获取会话列表失败:', error);
          this.sessionList = [];
          toast.error(`获取游戏世界失败: ${error.message || '未知错误'}`);
        });
    },

    // 显示会话选择对话框
    showSessionSelect() {
      // 如果还没有选择会话，则默认选择Forest1
      if (!this.selectedSessionName && this.defaultSessionName) {
        this.selectedSessionName = this.defaultSessionName;
      }
      this.sessionSelectDialogVisible = true;
    },

    // 确认选择会话
    confirmSessionSelect() {
      if (!this.selectedSessionName) {
        toast.warning('请选择一个游戏世界');
        return;
      }

      toast.success(`已选择游戏世界: ${this.activeSessionLabel}`);
      this.sessionSelectDialogVisible = false;
    },

    // 处理下拉菜单命令
    handleCommand(command, player) {
      this.currentPlayer = { ...player };
      switch (command) {
        case 'kick':
          this.kickPlayer(player);
          break;
        case 'ban':
          this.banPlayer(player);
          break;
        case 'kill':
          this.killPlayer(player);
          break;
        case 'godMode':
          this.toggleGodMode(player);
          break;
        case 'creativeMode':
          this.toggleCreativeMode(player);
          break;
        case 'resurrect':
          this.resurrectPlayer(player);
          break;
        case 'message':
          this.sendMessage();
          break;
        default:
          break;
      }
    },

    // 杀死玩家
    async killPlayer(player) {
      try {
        await confirmAction(
          `确定要杀死玩家 ${player.player_name} 吗？该操作会导致玩家死亡。`,
          '杀死玩家',
          { destructive: true }
        );
      } catch {
        return;
      }

      const loadingId = toast.loading('正在执行操作...');
      try {
        const response = await playerApi.killPlayer(player, this.activeSessionName);
        if (!response || response.status !== 200) throw new Error(response?.msg || '命令执行失败');
        toast.success(`已杀死玩家 ${player.player_name}`);
        this.playerDetailVisible = false;
        this.refreshData();
      } catch (error) {
        console.error('杀死玩家失败:', error);
        toast.error(`杀死玩家失败: ${error.message || '未知错误'}`);
      } finally {
        toast.dismiss(loadingId);
      }
    },

    // 切换无敌模式
    toggleGodMode(player) {
      this.currentPlayer = player;
      this.godModeForm.enabled = true; // 默认开启
      this.godModeDialogVisible = true;
    },

    // 确认设置无敌模式
    confirmGodMode() {
      this.settingGodMode = true;

      playerApi.setGodMode(
        this.currentPlayer,
        this.godModeForm.enabled,
        this.activeSessionName
      )
        .then(response => {
          if (response && response.status === 200) {
            const status = this.godModeForm.enabled ? '开启' : '关闭';
            toast.success(`已${status}玩家 ${this.currentPlayer.player_name} 的无敌模式`);
            this.godModeDialogVisible = false;
          } else {
            throw new Error(response.msg || '命令执行失败');
          }
        })
        .catch(error => {
          console.error('设置无敌模式失败:', error);
          toast.error(`设置无敌模式失败: ${error.message || '未知错误'}`);
        })
        .finally(() => {
          this.settingGodMode = false;
        });
    },

    // 切换制作模式
    toggleCreativeMode(player) {
      this.currentPlayer = player;
      this.creativeModeForm.enabled = true; // 默认开启
      this.creativeModeDialogVisible = true;
    },

    // 确认设置制作模式
    confirmCreativeMode() {
      this.settingCreativeMode = true;

      playerApi.setCreativeMode(
        this.currentPlayer,
        this.creativeModeForm.enabled,
        this.activeSessionName
      )
        .then(response => {
          if (response && response.status === 200) {
            const status = this.creativeModeForm.enabled ? '开启' : '关闭';
            toast.success(`已${status}玩家 ${this.currentPlayer.player_name} 的制作模式`);
            this.creativeModeDialogVisible = false;
          } else {
            throw new Error(response.msg || '命令执行失败');
          }
        })
        .catch(error => {
          console.error('设置制作模式失败:', error);
          toast.error(`设置制作模式失败: ${error.message || '未知错误'}`);
        })
        .finally(() => {
          this.settingCreativeMode = false;
        });
    },

    // 复活玩家
    async resurrectPlayer(player) {
      try {
        await confirmAction(`确定要复活玩家 ${player.player_name} 吗？`, '复活玩家');
      } catch {
        return;
      }

      const loadingId = toast.loading('正在执行操作...');
      try {
        const response = await playerApi.resurrectPlayer(player, this.activeSessionName);
        if (!response || response.status !== 200) throw new Error(response?.msg || '命令执行失败');
        toast.success(`已复活玩家 ${player.player_name}`);
        this.refreshData();
      } catch (error) {
        console.error('复活玩家失败:', error);
        toast.error(`复活玩家失败: ${error.message || '未知错误'}`);
      } finally {
        toast.dismiss(loadingId);
      }
    },

    // 手动更新玩家列表
    showUpdateDialog() {
      // 初始化表单数据
      this.updateForm = {
        archive_name: this.archiveOptions.length > 0 ? this.archiveOptions[0].value : '',
        world_name: ''
      };

      // 生成世界名称选项
      this.$nextTick(() => {
        this.worldOptions = this.generateWorldOptions();
      });

      this.updateDialogVisible = true;
    },

    // 存档变更时更新世界选项
    onArchiveChange() {
      // 重置世界名称
      this.updateForm.world_name = '';

      // 重新生成世界选项
      this.$nextTick(() => {
        this.worldOptions = this.generateWorldOptions();
      });
    },

    // 确认更新玩家列表
    confirmUpdate() {
      if (!this.updateForm.archive_name) {
        toast.warning('请选择存档');
        return;
      }

      this.updating = true;

      // 准备请求参数
      const updateParams = {
        archive_name: this.updateForm.archive_name,
        world_name: this.updateForm.world_name || ''
      };

      playerApi.updatePlayerInfo(updateParams)
        .then(() => {
          toast.success('玩家列表更新成功');
          this.updateDialogVisible = false;
          this.refreshData();
        })
        .catch(error => {
          console.error('更新玩家列表失败:', error);
          toast.error(`更新玩家列表失败: ${error.message || '未知错误'}`);
        })
        .finally(() => {
          this.updating = false;
        });
    }
  }
};
</script>

<style scoped>
.player-list-page {
  width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.title-container {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.title-container h1 {
  font-size: 18px;
  font-weight: 600;
  line-height: 28px;
}

.filter-card {
  margin-bottom: 16px;
}

.filter-form {
  display: grid;
  grid-template-columns: repeat(4, minmax(150px, 1fr)) auto;
  align-items: flex-end;
  gap: 12px;
}

.filter-actions,
.action-buttons,
.row-actions,
.steam-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.table-operations {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.action-buttons {
  justify-content: flex-end;
  flex-wrap: wrap;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  gap: 8px;
  color: var(--muted-foreground);
}

.table-wrap {
  width: 100%;
  overflow-x: auto;
}

.table-wrap :deep(table) {
  min-width: 1280px;
}

.action-column {
  position: sticky;
  right: 0;
  min-width: 108px;
  background: var(--card);
  text-align: right;
}

.player-name-cell {
  display: flex;
  max-width: 180px;
  align-items: center;
  gap: 6px;
}

.player-name-cell > svg {
  flex: none;
  color: var(--muted-foreground);
}

.mono-cell {
  max-width: 180px;
  overflow: hidden;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pagination-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
  color: var(--muted-foreground);
  font-size: 13px;
}

.pagination-bar :deep([data-slot='native-select-wrapper']) {
  width: 76px;
}

.player-detail-sheet {
  width: min(94vw, 560px);
  max-width: 560px;
}

.player-detail-scroll {
  min-height: 0;
  flex: 1;
  padding-right: 12px;
}

.player-detail {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 2px 0 24px;
}

.player-detail-heading,
.detail-player-name {
  display: flex;
  align-items: center;
  gap: 10px;
}

.player-detail-heading > div {
  min-width: 0;
}

.detail-player-name strong {
  overflow-wrap: anywhere;
  font-size: 16px;
}

.player-detail-heading > div > span {
  display: block;
  margin-top: 4px;
  color: var(--muted-foreground);
  font-size: 12px;
  overflow-wrap: anywhere;
}

.player-description-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.player-description-grid > div {
  min-width: 0;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}

.player-description-grid > div:nth-child(odd) {
  border-right: 1px solid var(--border);
}

.player-description-grid > div:nth-last-child(-n + 2) {
  border-bottom: 0;
}

.player-description-grid dt {
  margin-bottom: 3px;
  color: var(--muted-foreground);
  font-size: 12px;
}

.player-description-grid dd {
  min-width: 0;
  overflow-wrap: anywhere;
}

.player-detail section h3 {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
}

.detail-action-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

@media (max-width: 1180px) {
  .filter-form {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filter-actions {
    grid-column: 1 / -1;
  }
}

@media (max-width: 720px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .action-buttons {
    justify-content: flex-start;
  }

  .action-buttons > :deep(button) {
    flex: 1 1 calc(50% - 4px);
  }

  .action-buttons > :deep([data-slot='badge']) {
    width: 100%;
    white-space: normal;
  }

  .filter-form {
    grid-template-columns: minmax(0, 1fr);
  }

  .filter-actions {
    grid-column: auto;
  }

  .table-operations {
    align-items: stretch;
    flex-direction: column;
    flex-wrap: wrap;
  }

  .pagination-bar {
    justify-content: flex-start;
    overflow-x: auto;
  }

  .player-description-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .player-description-grid > div,
  .player-description-grid > div:nth-child(odd),
  .player-description-grid > div:nth-last-child(-n + 2) {
    border-right: 0;
    border-bottom: 1px solid var(--border);
  }

  .player-description-grid > div:last-child {
    border-bottom: 0;
  }

  .detail-action-grid {
    grid-template-columns: 1fr;
  }
}
</style>

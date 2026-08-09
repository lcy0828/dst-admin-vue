<template>
  <div class="flex min-w-0 flex-col gap-6">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold tracking-normal">系统设置</h1>
        <p class="mt-1 text-sm text-muted-foreground">管理界面、安全、备份、通知和当前主机运行状态。</p>
      </div>
      <UiButton variant="outline" size="sm" :disabled="loading" @click="loadSettings()">
        <Spinner v-if="loading" data-icon="inline-start" />
        <RefreshCw v-else data-icon="inline-start" />
        刷新
      </UiButton>
    </header>

    <Alert v-if="loadError" variant="destructive"><CircleAlert /><AlertTitle>系统设置加载失败</AlertTitle><AlertDescription>{{ loadError }}</AlertDescription><AlertAction><UiButton size="sm" variant="outline" @click="loadSettings(false)">重试</UiButton></AlertAction></Alert>
    <Alert v-if="lockedSettingCount > 0"><CircleAlert /><AlertTitle>部分设置由环境变量管理</AlertTitle><AlertDescription>{{ lockedSettingCount }} 个字段已锁定，页面不会提交或覆盖这些字段。</AlertDescription></Alert>
    <div v-if="initialLoading" class="flex flex-col gap-3"><Skeleton class="h-10 w-full" /><Skeleton class="h-72 w-full" /></div>

    <Tabs v-else v-model="activeTab" class="settings-tabs-root">
      <div class="settings-tabs-scroll">
        <TabsList variant="line" class="settings-tabs">
          <TabsTrigger value="basic" class="settings-tab-trigger"><Settings2 />基本设置</TabsTrigger>
          <TabsTrigger value="security" class="settings-tab-trigger"><ShieldCheck />安全设置</TabsTrigger>
          <TabsTrigger value="backup" class="settings-tab-trigger"><DatabaseBackup />备份设置</TabsTrigger>
          <TabsTrigger value="notification" class="settings-tab-trigger"><BellRing />通知设置</TabsTrigger>
          <TabsTrigger value="systemStatus" class="settings-tab-trigger"><Activity />系统状态</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="basic" class="settings-tab-content">
        <Card size="sm" class="settings-card">
          <CardHeader>
            <CardTitle>基本设置</CardTitle>
            <CardDescription>设置管理系统的显示名称、地区格式和界面主题。</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup class="settings-form">
              <Field orientation="responsive" :data-invalid="Boolean(formErrors.systemName)">
                <FieldContent>
                  <FieldLabel for="system-name">管理系统名称</FieldLabel>
                  <FieldError v-if="formErrors.systemName">{{ formErrors.systemName }}</FieldError>
                </FieldContent>
                <UiInput id="system-name" v-model="settings.systemName" class="setting-control" :disabled="!fieldEditable('ui.systemName')" :aria-invalid="Boolean(formErrors.systemName)" placeholder="请输入管理系统名称" @input="formErrors.systemName = ''" />
              </Field>

              <Field orientation="responsive" :data-invalid="Boolean(formErrors.adminEmail)">
                <FieldContent>
                  <FieldLabel for="admin-email">管理员联系邮箱</FieldLabel>
                  <FieldDescription>可留空；填写后用于接收管理通知。</FieldDescription>
                  <FieldError v-if="formErrors.adminEmail">{{ formErrors.adminEmail }}</FieldError>
                </FieldContent>
                <UiInput id="admin-email" v-model="settings.adminEmail" class="setting-control" type="email" :disabled="!fieldEditable('ui.adminEmail')" :aria-invalid="Boolean(formErrors.adminEmail)" placeholder="请输入管理员联系邮箱" @input="formErrors.adminEmail = ''" />
              </Field>

              <Field orientation="responsive">
                <FieldContent><FieldLabel for="system-language">系统语言</FieldLabel></FieldContent>
                <UiSelect v-model="settings.language" :disabled="!fieldEditable('ui.language')">
                  <SelectTrigger id="system-language" class="setting-control"><SelectValue placeholder="请选择系统语言" /></SelectTrigger>
                  <SelectContent><SelectGroup>
                    <SelectItem value="zh-CN">简体中文</SelectItem>
                    <SelectItem value="en-US" disabled>English</SelectItem>
                    <SelectItem value="ja-JP" disabled>日本語</SelectItem>
                  </SelectGroup></SelectContent>
                </UiSelect>
              </Field>

              <Field orientation="responsive">
                <FieldContent><FieldLabel for="system-timezone">时区设置</FieldLabel></FieldContent>
                <UiSelect v-model="settings.timezone" :disabled="!fieldEditable('ui.timezone')">
                  <SelectTrigger id="system-timezone" class="setting-control"><SelectValue placeholder="请选择时区" /></SelectTrigger>
                  <SelectContent><SelectGroup>
                    <SelectItem value="Asia/Shanghai">(GMT+08:00) 北京时间</SelectItem>
                    <SelectItem value="UTC">(GMT+00:00) 协调世界时</SelectItem>
                    <SelectItem value="America/Los_Angeles">(GMT-08:00) 太平洋标准时间</SelectItem>
                    <SelectItem value="America/New_York">(GMT-05:00) 东部标准时间</SelectItem>
                    <SelectItem value="Europe/Berlin">(GMT+01:00) 中欧标准时间</SelectItem>
                    <SelectItem value="Asia/Tokyo">(GMT+09:00) 日本标准时间</SelectItem>
                  </SelectGroup></SelectContent>
                </UiSelect>
              </Field>

              <Field orientation="responsive">
                <FieldContent><FieldLabel for="date-format">日期格式</FieldLabel></FieldContent>
                <UiSelect v-model="settings.dateFormat" :disabled="!fieldEditable('ui.dateFormat')">
                  <SelectTrigger id="date-format" class="setting-control"><SelectValue placeholder="请选择日期格式" /></SelectTrigger>
                  <SelectContent><SelectGroup>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="YYYY年MM月DD日">YYYY年MM月DD日</SelectItem>
                  </SelectGroup></SelectContent>
                </UiSelect>
              </Field>

              <Field>
                <FieldContent>
                  <FieldTitle id="theme-options-label">界面主题</FieldTitle>
                  <FieldDescription>默认使用石墨朱橙，也可以切换预设或选择自定义主色。</FieldDescription>
                </FieldContent>
                <ToggleGroup :model-value="selectedThemeId" type="single" class="theme-options" aria-labelledby="theme-options-label" :disabled="!fieldEditable('ui.theme')" @update:model-value="selectThemeById">
                  <ToggleGroupItem v-for="preset in themePresets" :key="preset.id" :value="preset.id" class="theme-option" :style="themeOptionStyle(preset)">
                    <span class="theme-option-head">
                      <span class="theme-option-name">{{ preset.name }}</span>
                      <Badge v-if="selectedThemeId === preset.id" variant="secondary">已选择</Badge>
                    </span>
                    <span class="theme-swatches" aria-hidden="true">
                      <span class="theme-swatch theme-swatch-sidebar"></span>
                      <span class="theme-swatch theme-swatch-primary"></span>
                      <span class="theme-swatch theme-swatch-accent"></span>
                      <span class="theme-swatch theme-swatch-background"></span>
                    </span>
                  </ToggleGroupItem>
                </ToggleGroup>
                <div class="custom-theme-control">
                  <div class="custom-theme-copy">
                    <FieldLabel for="custom-theme-color">自定义主色</FieldLabel>
                    <FieldDescription>{{ selectedThemeId === 'custom' ? '当前使用自定义颜色。' : '选择颜色后立即预览。' }}</FieldDescription>
                  </div>
                  <UiInput id="custom-theme-color" v-model="settings.theme" class="color-input" type="color" aria-label="自定义主题主色" :disabled="!fieldEditable('ui.theme')" @update:model-value="previewCustomTheme" />
                  <Badge v-if="selectedThemeId === 'custom'" variant="secondary">已选择</Badge>
                  <UiButton variant="ghost" size="sm" :disabled="!fieldEditable('ui.theme')" @click="resetDefaultTheme">恢复石墨默认</UiButton>
                </div>
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter class="settings-card-footer">
            <UiButton variant="outline" :disabled="loading" @click="resetSettings"><RotateCcw data-icon="inline-start" />重置</UiButton>
            <UiButton :disabled="loading" @click="saveSettings"><Spinner v-if="loading" data-icon="inline-start" /><Save v-else data-icon="inline-start" />保存设置</UiButton>
          </CardFooter>
        </Card>
      </TabsContent>

      <TabsContent value="security" class="settings-tab-content">
        <Card size="sm" class="settings-card">
          <CardHeader><CardTitle>安全设置</CardTitle><CardDescription>控制登录密码、会话和管理端访问范围。</CardDescription></CardHeader>
          <CardContent>
            <FieldGroup class="settings-form">
              <Field orientation="horizontal">
                <FieldContent><FieldLabel for="password-complexity">启用密码复杂度检查</FieldLabel><FieldDescription>开启后，密码必须包含大小写字母、数字和特殊字符。</FieldDescription></FieldContent>
                <UiSwitch id="password-complexity" v-model="settings.passwordComplexity" :disabled="!fieldEditable('security.passwordComplexity')" />
              </Field>
              <Field orientation="responsive" :data-disabled="!fieldEditable('security.minPasswordLength')">
                <FieldContent><FieldLabel for="min-password-length">密码最小长度</FieldLabel><FieldDescription>独立于复杂度检查，允许设置 6 至 20 位。</FieldDescription></FieldContent>
                <UiInput id="min-password-length" class="number-control" type="number" min="6" max="20" :disabled="!fieldEditable('security.minPasswordLength')" :model-value="String(settings.minPasswordLength)" @update:model-value="settings.minPasswordLength = Number($event)" />
              </Field>
              <Field orientation="responsive">
                <FieldContent><FieldLabel for="session-timeout">会话超时时间（分钟）</FieldLabel><FieldDescription>用户无操作后自动退出系统的时间。</FieldDescription></FieldContent>
                <UiInput id="session-timeout" class="number-control" type="number" min="5" max="1440" :disabled="!fieldEditable('security.sessionTimeout')" :model-value="String(settings.sessionTimeout)" @update:model-value="settings.sessionTimeout = Number($event)" />
              </Field>
              <Field orientation="responsive">
                <FieldContent><FieldLabel for="max-login-attempts">最大登录尝试次数</FieldLabel><FieldDescription>超过次数后账户将被临时锁定。</FieldDescription></FieldContent>
                <UiInput id="max-login-attempts" class="number-control" type="number" min="3" max="10" :disabled="!fieldEditable('security.maxLoginAttempts')" :model-value="String(settings.maxLoginAttempts)" @update:model-value="settings.maxLoginAttempts = Number($event)" />
              </Field>
              <Field orientation="horizontal" data-disabled>
                <FieldContent><FieldLabel for="two-factor-auth">启用双因素认证</FieldLabel><FieldDescription>需要先完成身份验证器密钥绑定，当前版本尚未开放。</FieldDescription></FieldContent>
                <UiSwitch id="two-factor-auth" v-model="settings.twoFactorAuth" disabled />
              </Field>
              <Field>
                <FieldLabel for="ip-whitelist">IP 白名单</FieldLabel>
                <UiTextarea id="ip-whitelist" v-model="settings.ipWhitelist" rows="3" :disabled="!fieldEditable('security.ipWhitelist')" placeholder="每行一个 IP 地址或网段，例如：192.168.1.1 或 192.168.1.0/24" />
                <FieldDescription>仅允许这些 IP 地址访问管理系统，留空表示不限制。</FieldDescription>
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter class="settings-card-footer">
            <UiButton variant="outline" :disabled="loading" @click="resetSettings"><RotateCcw data-icon="inline-start" />重置</UiButton>
            <UiButton :disabled="loading" @click="saveSettings"><Spinner v-if="loading" data-icon="inline-start" /><Save v-else data-icon="inline-start" />保存设置</UiButton>
          </CardFooter>
        </Card>
      </TabsContent>

      <TabsContent value="backup" class="settings-tab-content">
        <Card size="sm" class="settings-card">
          <CardHeader><CardTitle>备份设置</CardTitle><CardDescription>为所有已接管房间同步真实备份策略。</CardDescription></CardHeader>
          <CardContent>
            <FieldGroup class="settings-form">
              <Field orientation="horizontal">
                <FieldContent><FieldLabel for="auto-backup">启用自动备份</FieldLabel><FieldDescription>定期自动备份系统数据。</FieldDescription></FieldContent>
                <UiSwitch id="auto-backup" v-model="settings.autoBackup" :disabled="!fieldEditable('backup.auto')" />
              </Field>
              <Field orientation="responsive" :data-disabled="!settings.autoBackup">
                <FieldContent><FieldLabel for="backup-frequency">备份频率</FieldLabel></FieldContent>
                <UiSelect v-model="settings.backupFrequency" :disabled="!settings.autoBackup || !fieldEditable('backup.frequency')">
                  <SelectTrigger id="backup-frequency" class="setting-control"><SelectValue placeholder="请选择备份频率" /></SelectTrigger>
                  <SelectContent><SelectGroup><SelectItem value="daily">每天</SelectItem><SelectItem value="weekly">每周</SelectItem><SelectItem value="monthly">每月</SelectItem></SelectGroup></SelectContent>
                </UiSelect>
              </Field>
              <Field orientation="responsive" :data-disabled="!settings.autoBackup">
                <FieldContent><FieldLabel for="backup-time">备份时间</FieldLabel></FieldContent>
                <UiInput id="backup-time" v-model="settings.backupTime" class="setting-control" type="time" :disabled="!settings.autoBackup || !fieldEditable('backup.time')" />
              </Field>
              <Field orientation="responsive" :data-disabled="!settings.autoBackup">
                <FieldContent><FieldLabel for="backup-retention">保留备份数量</FieldLabel><FieldDescription>系统将保留的最近备份数量。</FieldDescription></FieldContent>
                <UiInput id="backup-retention" class="number-control" type="number" min="1" max="100" :disabled="!settings.autoBackup || !fieldEditable('backup.retention')" :model-value="String(settings.backupRetention)" @update:model-value="settings.backupRetention = Number($event)" />
              </Field>
              <Field orientation="responsive" :data-disabled="!settings.autoBackup">
                <FieldContent><FieldLabel for="backup-location">备份存储位置</FieldLabel><FieldDescription>真实本地备份路径，修改后重启服务生效。</FieldDescription></FieldContent>
                <UiInput id="backup-location" v-model="settings.backupLocation" class="setting-control" :disabled="!settings.autoBackup || !fieldEditable('paths.backup')" placeholder="请输入备份存储路径" />
              </Field>
              <FieldSeparator>手动备份</FieldSeparator>
              <Field orientation="responsive">
                <FieldContent><FieldTitle>立即执行</FieldTitle><FieldDescription>对当前所有已接管房间创建备份，或查看真实备份历史。</FieldDescription></FieldContent>
                <div class="field-actions">
                  <UiButton :disabled="loading" @click="handleBackupNow"><DatabaseBackup data-icon="inline-start" />立即备份</UiButton>
                  <UiButton variant="outline" :disabled="loading" @click="showBackupHistory"><History data-icon="inline-start" />查看备份历史</UiButton>
                </div>
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter class="settings-card-footer">
            <UiButton variant="outline" :disabled="loading" @click="resetSettings"><RotateCcw data-icon="inline-start" />重置</UiButton>
            <UiButton :disabled="loading" @click="saveSettings"><Spinner v-if="loading" data-icon="inline-start" /><Save v-else data-icon="inline-start" />保存设置</UiButton>
          </CardFooter>
        </Card>
      </TabsContent>

      <TabsContent value="notification" class="settings-tab-content">
        <Card size="sm" class="settings-card">
          <CardHeader><CardTitle>通知设置</CardTitle><CardDescription>配置 SMTP 连接；通知事件开关将在后续版本开放。</CardDescription></CardHeader>
          <CardContent>
            <FieldGroup class="settings-form">
              <Field orientation="horizontal">
                <FieldContent><FieldLabel for="email-notification">启用邮件通知</FieldLabel><FieldDescription>启用系统邮件通知功能。</FieldDescription></FieldContent>
                <UiSwitch id="email-notification" v-model="settings.emailNotification" :disabled="!fieldEditable('notification.emailEnabled')" />
              </Field>
              <Field orientation="responsive" :data-disabled="!settings.emailNotification" :data-invalid="Boolean(formErrors.smtpServer)">
                <FieldContent><FieldLabel for="smtp-server">SMTP 服务器</FieldLabel><FieldError v-if="formErrors.smtpServer">{{ formErrors.smtpServer }}</FieldError></FieldContent>
                <UiInput id="smtp-server" v-model="settings.smtpServer" class="setting-control" :disabled="!settings.emailNotification || !fieldEditable('notification.smtpServer')" :aria-invalid="Boolean(formErrors.smtpServer)" placeholder="例如：smtp.example.com" @input="formErrors.smtpServer = ''" />
              </Field>
              <Field orientation="responsive" :data-disabled="!settings.emailNotification">
                <FieldContent><FieldLabel for="smtp-port">SMTP 端口</FieldLabel></FieldContent>
                <UiInput id="smtp-port" class="number-control" type="number" min="1" max="65535" :disabled="!settings.emailNotification || !fieldEditable('notification.smtpPort')" :model-value="String(settings.smtpPort)" @update:model-value="settings.smtpPort = Number($event)" />
              </Field>
              <Field orientation="responsive" :data-disabled="!settings.emailNotification" :data-invalid="Boolean(formErrors.smtpUsername)">
                <FieldContent><FieldLabel for="smtp-username">SMTP 用户名</FieldLabel><FieldError v-if="formErrors.smtpUsername">{{ formErrors.smtpUsername }}</FieldError></FieldContent>
                <UiInput id="smtp-username" v-model="settings.smtpUsername" class="setting-control" :disabled="!settings.emailNotification || !fieldEditable('notification.smtpUsername')" :aria-invalid="Boolean(formErrors.smtpUsername)" placeholder="邮箱账号" @input="formErrors.smtpUsername = ''" />
              </Field>
              <Field orientation="responsive" :data-disabled="!settings.emailNotification" :data-invalid="Boolean(formErrors.smtpPassword)">
                <FieldContent><FieldLabel for="smtp-password">SMTP 密码</FieldLabel><FieldError v-if="formErrors.smtpPassword">{{ formErrors.smtpPassword }}</FieldError></FieldContent>
                <UiInput id="smtp-password" v-model="settings.smtpPassword" class="setting-control" type="password" :disabled="!settings.emailNotification || !fieldEditable('notification.smtpPassword')" :aria-invalid="Boolean(formErrors.smtpPassword)" :placeholder="smtpPasswordConfigured ? '已配置，留空表示保持不变' : '邮箱密码或授权码'" @input="formErrors.smtpPassword = ''" />
              </Field>
              <Field orientation="responsive" :data-disabled="!settings.emailNotification" :data-invalid="Boolean(formErrors.senderEmail)">
                <FieldContent><FieldLabel for="sender-email">发件人邮箱</FieldLabel><FieldError v-if="formErrors.senderEmail">{{ formErrors.senderEmail }}</FieldError></FieldContent>
                <UiInput id="sender-email" v-model="settings.senderEmail" class="setting-control" type="email" :disabled="!settings.emailNotification || !fieldEditable('notification.senderEmail')" :aria-invalid="Boolean(formErrors.senderEmail)" placeholder="系统发送邮件的邮箱地址" @input="formErrors.senderEmail = ''" />
              </Field>
              <Field orientation="responsive" :data-disabled="!settings.emailNotification">
                <FieldContent><FieldTitle>连接检查</FieldTitle><FieldDescription>使用当前 SMTP 参数执行一次真实连接与认证测试。</FieldDescription></FieldContent>
                <UiButton variant="outline" :disabled="loading || !settings.emailNotification" @click="testEmailConnection"><Send data-icon="inline-start" />测试邮件连接</UiButton>
              </Field>
              <FieldSeparator>通知事件</FieldSeparator>
              <FieldGroup class="notification-events">
                <Field orientation="horizontal" data-disabled><FieldLabel for="notify-server-status">服务器状态变更</FieldLabel><UiSwitch id="notify-server-status" v-model="settings.notifyServerStatus" disabled /></Field>
                <Field orientation="horizontal" data-disabled><FieldLabel for="notify-login-failures">用户登录异常</FieldLabel><UiSwitch id="notify-login-failures" v-model="settings.notifyLoginFailures" disabled /></Field>
                <Field orientation="horizontal" data-disabled><FieldLabel for="notify-backup-results">数据库备份结果</FieldLabel><UiSwitch id="notify-backup-results" v-model="settings.notifyBackupResults" disabled /></Field>
                <Field orientation="horizontal" data-disabled><FieldLabel for="notify-system-updates">系统更新通知</FieldLabel><UiSwitch id="notify-system-updates" v-model="settings.notifySystemUpdates" disabled /></Field>
              </FieldGroup>
            </FieldGroup>
          </CardContent>
          <CardFooter class="settings-card-footer">
            <UiButton variant="outline" :disabled="loading" @click="resetSettings"><RotateCcw data-icon="inline-start" />重置</UiButton>
            <UiButton :disabled="loading" @click="saveSettings"><Spinner v-if="loading" data-icon="inline-start" /><Save v-else data-icon="inline-start" />保存设置</UiButton>
          </CardFooter>
        </Card>
      </TabsContent>

      <TabsContent value="systemStatus" class="settings-tab-content">
        <div class="status-header">
          <div><h2>系统详细监控</h2><p>查看当前运行管理后端的主机与 Go 进程状态。</p></div>
          <UiButton size="sm" :disabled="statusLoading" @click="refreshSystemStatus"><Spinner v-if="statusLoading" data-icon="inline-start" /><RefreshCw v-else data-icon="inline-start" />刷新状态</UiButton>
        </div>

        <Alert v-if="statusError" variant="destructive" class="mt-4"><CircleAlert /><AlertTitle>系统状态加载失败</AlertTitle><AlertDescription>{{ statusError }}</AlertDescription></Alert>
        <div v-if="statusLoading" class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Skeleton v-for="index in 4" :key="index" class="h-52 w-full" /></div>
        <template v-else-if="statusLoaded">
        <div class="status-section-heading"><h3>系统状态</h3><Separator /></div>
        <div class="status-grid system-status-grid">
          <Card>
            <CardHeader><CardTitle class="status-card-title"><Cpu />CPU 状态</CardTitle><CardDescription>{{ systemStatus.cpu_model }}</CardDescription></CardHeader>
            <CardContent class="status-card-content">
              <dl class="status-list"><div><dt>频率</dt><dd>{{ systemStatus.cpu_mhz }} MHz</dd></div><div><dt>物理核心</dt><dd>{{ systemStatus.cpu_cores }}</dd></div><div><dt>逻辑核心</dt><dd>{{ systemStatus.cpu_threads }}</dd></div></dl>
              <div class="usage-block"><div><span>使用率</span><strong>{{ clampPercent(systemStatus.cpu_usage).toFixed(1) }}%</strong></div><UiProgress :model-value="clampPercent(systemStatus.cpu_usage)" aria-label="CPU 使用率" /></div>
              <div v-if="(systemStatus.cpu_core_usage || []).length" class="core-usage-container">
                <div v-for="(usage, index) in (systemStatus.cpu_core_usage || [])" :key="index" class="core-usage-item">
                  <div class="core-usage-label"><span>核心 {{ index }}</span><Badge v-if="isCoreOverloaded(usage)" variant="destructive">高负载</Badge><span>{{ Number(usage).toFixed(2) }}%</span></div>
                  <UiProgress :model-value="clampPercent(usage)" :aria-label="`CPU 核心 ${index} 使用率`" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle class="status-card-title"><Activity />系统负载</CardTitle><CardDescription>{{ systemStatus.hostname }}</CardDescription></CardHeader>
            <CardContent><dl class="status-list"><div><dt>1 分钟</dt><dd>{{ systemStatus.cpu_load1 }}</dd></div><div><dt>5 分钟</dt><dd>{{ systemStatus.cpu_load5 }}</dd></div><div><dt>15 分钟</dt><dd>{{ systemStatus.cpu_load15 }}</dd></div><div><dt>系统</dt><dd>{{ systemStatus.os_info }}</dd></div></dl></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle class="status-card-title"><MemoryStick />内存状态</CardTitle><CardDescription>物理内存占用</CardDescription></CardHeader>
            <CardContent><dl class="status-list"><div><dt>总内存</dt><dd>{{ formatMemory(systemStatus.total_memory) }}</dd></div><div><dt>已用内存</dt><dd>{{ formatMemory(systemStatus.used_memory) }}</dd></div><div><dt>空闲内存</dt><dd>{{ formatMemory(systemStatus.free_memory) }}</dd></div></dl><div class="usage-block"><div><span>使用率</span><strong>{{ clampPercent(systemStatus.memory_usage).toFixed(1) }}%</strong></div><UiProgress :model-value="clampPercent(systemStatus.memory_usage)" aria-label="内存使用率" /></div></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle class="status-card-title"><HardDrive />磁盘状态</CardTitle><CardDescription>管理后端所在磁盘</CardDescription></CardHeader>
            <CardContent><dl class="status-list"><div><dt>总空间</dt><dd>{{ systemStatus.total_disk }} GB</dd></div><div><dt>已用空间</dt><dd>{{ systemStatus.used_disk }} GB</dd></div><div><dt>空闲空间</dt><dd>{{ systemStatus.free_disk }} GB</dd></div></dl><div class="usage-block"><div><span>使用率</span><strong>{{ clampPercent(systemStatus.disk_usage).toFixed(1) }}%</strong></div><UiProgress :model-value="clampPercent(systemStatus.disk_usage)" aria-label="磁盘使用率" /></div></CardContent>
          </Card>
        </div>

        <div class="status-section-heading"><h3>程序状态</h3><Separator /></div>
        <div class="status-grid process-status-grid">
          <Card>
            <CardHeader><CardTitle class="status-card-title"><ChartNoAxesCombined />进程信息</CardTitle><CardDescription>当前管理后端进程</CardDescription></CardHeader>
            <CardContent><dl class="status-list"><div><dt>进程 ID</dt><dd>{{ systemStatus.process_id }}</dd></div><div><dt>运行时间</dt><dd>{{ systemStatus.process_uptime_fmt }}</dd></div><div><dt>物理内存</dt><dd>{{ systemStatus.process_memory_rss }} MB</dd></div><div><dt>虚拟内存</dt><dd>{{ systemStatus.process_memory_vms }} MB</dd></div><div><dt>线程数</dt><dd>{{ systemStatus.process_threads }}</dd></div></dl><div class="usage-block"><div><span>CPU 使用率</span><strong>{{ clampPercent(systemStatus.process_cpu_usage).toFixed(1) }}%</strong></div><UiProgress :model-value="clampPercent(systemStatus.process_cpu_usage)" aria-label="管理后端进程 CPU 使用率" /></div></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle class="status-card-title"><CodeXml />Go 运行时</CardTitle><CardDescription>{{ systemStatus.go_version }}</CardDescription></CardHeader>
            <CardContent><dl class="status-list"><div><dt>Goroutines</dt><dd>{{ systemStatus.go_routines }}</dd></div><div><dt>堆分配</dt><dd>{{ systemStatus.go_memory_alloc }} MB</dd></div><div><dt>系统分配</dt><dd>{{ systemStatus.go_memory_sys }} MB</dd></div><div><dt>堆对象数</dt><dd>{{ systemStatus.go_memory_heap_objs }}</dd></div><div><dt>GC 暂停</dt><dd>{{ (systemStatus.go_gc_pause / 1000000).toFixed(2) }} ms</dd></div><div><dt>GC 运行次数</dt><dd>{{ systemStatus.go_gc_runs }}</dd></div></dl></CardContent>
          </Card>
        </div>

        <div class="status-section-heading"><h3>系统时间</h3><Separator /></div>
        <Card>
          <CardHeader><CardTitle class="status-card-title"><Clock3 />时间信息</CardTitle><CardDescription>主机启动与当前时间</CardDescription></CardHeader>
          <CardContent><dl class="status-list time-status-list"><div><dt>系统运行时间</dt><dd>{{ systemStatus.uptime_formatted }}</dd></div><div><dt>当前时间</dt><dd>{{ systemStatus.current_time }}</dd></div><div><dt>启动时间</dt><dd>{{ systemStatus.start_time }}</dd></div></dl></CardContent>
        </Card>
        </template>
      </TabsContent>
    </Tabs>

    <UiDialog v-model:open="backupHistoryVisible">
      <DialogScrollContent class="sm:max-w-4xl">
        <DialogHeader><DialogTitle>备份历史记录</DialogTitle><DialogDescription>所有已接管房间的真实备份文件。</DialogDescription></DialogHeader>
        <div class="table-scroll">
          <ShadcnTable>
            <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>房间</TableHead><TableHead>文件名</TableHead><TableHead>大小</TableHead><TableHead>创建时间</TableHead><TableHead>状态</TableHead><TableHead class="table-actions-head">操作</TableHead></TableRow></TableHeader>
            <TableBody>
              <TableRow v-for="backup in backupHistory" :key="backup.id"><TableCell>{{ backup.id }}</TableCell><TableCell>{{ backup.roomName }}</TableCell><TableCell>{{ backup.filename }}</TableCell><TableCell>{{ backup.size }}</TableCell><TableCell>{{ backup.createTime }}</TableCell><TableCell><Badge :variant="backup.status === 'success' ? 'secondary' : 'destructive'">{{ backup.status === 'success' ? '成功' : '失败' }}</Badge></TableCell><TableCell><div class="table-actions"><UiButton variant="outline" size="sm" :disabled="loading" @click="downloadBackup(backup)"><Download data-icon="inline-start" />下载</UiButton><UiButton variant="destructive" size="sm" :disabled="loading" @click="deleteBackup(backup)"><Trash2 data-icon="inline-start" />删除</UiButton></div></TableCell></TableRow>
              <TableEmpty v-if="backupHistory.length === 0" :colspan="7">
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>暂无备份记录</EmptyTitle>
                    <EmptyDescription>当前已接管房间还没有可下载的备份。</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </TableEmpty>
            </TableBody>
          </ShadcnTable>
        </div>
        <DialogFooter><UiButton variant="outline" @click="backupHistoryVisible = false">关闭</UiButton></DialogFooter>
      </DialogScrollContent>
    </UiDialog>
  </div>
</template>

<script>
import {
  Activity,
  BellRing,
  ChartNoAxesCombined,
  CircleAlert,
  Clock3,
  CodeXml,
  Cpu,
  DatabaseBackup,
  Download,
  HardDrive,
  History,
  MemoryStick,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  Settings2,
  ShieldCheck,
  Trash2
} from '@lucide/vue';
import { systemApi } from '@/api';
import { editableSystemSettingValues, TERMINAL_SYSTEM_JOB_STATES } from '@/api/systemSettingsSupport.mjs';
import { backupsV2API, jobsV2API, roomsV2API, systemV2API } from '@/api/v2';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog as UiDialog, DialogDescription, DialogFooter, DialogHeader, DialogScrollContent, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSeparator, FieldTitle } from '@/components/ui/field';
import { Input as UiInput } from '@/components/ui/input';
import { Progress as UiProgress } from '@/components/ui/progress';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Switch as UiSwitch } from '@/components/ui/switch';
import { Table as ShadcnTable, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea as UiTextarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { confirmAction } from '@/lib/feedback';
import { THEME_PRESETS, normalizeThemeColor, resolveThemePreset, themePresetById } from '@/theme/themePresets';
import { applySystemPreferences, previewSystemTheme } from '@/utils/systemPreferences';
import { getActiveRuntimeTarget } from '@/utils/runtimeTarget';
import { toast } from 'vue-sonner';

const APPLY_CONFIRMATION = 'APPLY SYSTEM SETTINGS';
export default {
  name: 'SystemSettings',
  components: {
    Activity,
    Alert,
    AlertAction,
    AlertDescription,
    AlertTitle,
    Badge,
    BellRing,
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
    ChartNoAxesCombined,
    CircleAlert,
    Clock3,
    CodeXml,
    Cpu,
    DatabaseBackup,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogScrollContent,
    DialogTitle,
    Download,
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyTitle,
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldSeparator,
    FieldTitle,
    HardDrive,
    History,
    MemoryStick,
    UiProgress,
    RefreshCw,
    RotateCcw,
    Save,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Send,
    Settings2,
    ShieldCheck,
    Separator,
    ShadcnTable,
    Skeleton,
    Spinner,
    TableBody,
    TableCell,
    TableEmpty,
    TableHead,
    TableHeader,
    TableRow,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    ToggleGroup,
    ToggleGroupItem,
    Trash2,
    UiButton,
    UiDialog,
    UiInput,
    UiSelect,
    UiSwitch,
    UiTextarea
  },
  data() {
    return {
      loading: false,
      initialLoading: true,
      loadError: '',
      statusLoading: false,
      statusLoaded: false,
      statusError: '',
      activeTab: 'basic',
      revision: '',
      settingsResponse: null,
      smtpPasswordConfigured: false,
      themePresets: THEME_PRESETS,
      formErrors: {
        systemName: '',
        adminEmail: '',
        smtpServer: '',
        smtpUsername: '',
        smtpPassword: '',
        senderEmail: ''
      },
      settings: {
        // 基本设置
        systemName: '',
        adminEmail: '',
        language: 'zh-CN',
        timezone: 'Asia/Shanghai',
        dateFormat: 'YYYY-MM-DD',
        theme: themePresetById('graphite').primary,

        // 安全设置
        passwordComplexity: false,
        minPasswordLength: 6,
        sessionTimeout: 1440,
        maxLoginAttempts: 5,
        twoFactorAuth: false,
        ipWhitelist: '',

        // 备份设置
        autoBackup: true,
        backupFrequency: 'daily',
        backupTime: '03:00',
        backupRetention: 7,
        backupLocation: '',

        // 通知设置
        emailNotification: false,
        smtpServer: '',
        smtpPort: 587,
        smtpUsername: '',
        smtpPassword: '',
        senderEmail: '',
        notifyServerStatus: true,
        notifyLoginFailures: true,
        notifyBackupResults: true,
        notifySystemUpdates: true
      },

      // 系统状态信息
      systemStatus: {
        cpu_model: '',
        cpu_mhz: 0,
        cpu_cores: 0,
        cpu_threads: 0,
        cpu_usage: 0,
        cpu_core_usage: [],
        cpu_load1: 0,
        cpu_load5: 0,
        cpu_load15: 0,
        total_memory: 0,
        used_memory: 0,
        free_memory: 0,
        memory_usage: 0,
        total_disk: 0,
        used_disk: 0,
        free_disk: 0,
        disk_usage: 0,
        os_info: '',
        hostname: '',
        uptime: 0,
        uptime_formatted: '',
        go_version: '',
        go_routines: 0,
        process_id: 0,
        process_uptime: 0,
        process_uptime_fmt: '',
        process_memory_rss: 0,
        process_memory_vms: 0,
        process_cpu_usage: 0,
        process_threads: 0,
        go_memory_alloc: 0,
        go_memory_sys: 0,
        go_memory_heap_sys: 0,
        go_memory_heap_objs: 0,
        go_gc_pause: 0,
        go_gc_runs: 0,
        current_time: '',
        start_time: ''
      },

      // 备份历史
      backupHistoryVisible: false,
      backupHistory: []
    };
  },
  computed: {
    selectedThemeId() {
      return resolveThemePreset(this.settings.theme).id;
    },
    lockedSettingCount() {
      return (this.settingsResponse?.fields || []).filter(field => field.environment && !field.editable).length;
    }
  },
  created() {
    this.loadSettings(false);
  },
  mounted() {
    // 初始加载系统状态
    if (this.activeTab === 'systemStatus') {
      this.refreshSystemStatus();
    }
  },
  beforeUnmount() {
    if (this.settingsResponse) applySystemPreferences(this.settingsResponse);
  },
  watch: {
    // 监听标签页切换，在切换到系统状态标签页时刷新数据
    activeTab(newVal) {
      if (newVal === 'systemStatus') {
        this.refreshSystemStatus();
      }
    }
  },
  methods: {
    field(response, id, fallback = '') {
      return response.fields?.find(item => item.id === id) || { value: fallback, configured: false };
    },
    fieldNumber(response, id, fallback) {
      const value = Number(this.field(response, id, fallback).value);
      return Number.isFinite(value) ? value : fallback;
    },
    fieldBoolean(response, id, fallback = false) {
      return this.field(response, id, String(fallback)).value === 'true';
    },
    fieldEditable(id) {
      const field = this.settingsResponse?.fields?.find(item => item.id === id);
      return field?.editable === true;
    },
    themeValue(response) {
      return normalizeThemeColor(this.field(response, 'ui.theme', themePresetById('graphite').primary).value);
    },
    themeOptionStyle(preset) {
      return {
        '--theme-primary': preset.primary,
        '--theme-accent': preset.accent,
        '--theme-sidebar': preset.sidebar,
        '--theme-background': preset.background
      };
    },
    selectThemeById(id) {
      if (!id) return;
      this.selectTheme(themePresetById(id));
    },
    selectTheme(preset) {
      this.settings.theme = preset.primary;
      previewSystemTheme(preset.primary);
    },
    previewCustomTheme(value) {
      if (!value) return;
      this.settings.theme = normalizeThemeColor(value);
      previewSystemTheme(this.settings.theme);
    },
    resetDefaultTheme() {
      this.selectTheme(themePresetById('graphite'));
    },
    populateSettings(response) {
      this.settingsResponse = response;
      this.revision = response.revision;
      this.smtpPasswordConfigured = this.field(response, 'notification.smtpPassword').configured;
      this.settings = {
        systemName: this.field(response, 'ui.systemName').value,
        adminEmail: this.field(response, 'ui.adminEmail').value,
        language: this.field(response, 'ui.language', 'zh-CN').value,
        timezone: this.field(response, 'ui.timezone', 'Asia/Shanghai').value,
        dateFormat: this.field(response, 'ui.dateFormat', 'YYYY-MM-DD').value,
        theme: this.themeValue(response),
        passwordComplexity: this.fieldBoolean(response, 'security.passwordComplexity'),
        minPasswordLength: this.fieldNumber(response, 'security.minPasswordLength', 6),
        sessionTimeout: this.fieldNumber(response, 'security.sessionTimeout', 1440),
        maxLoginAttempts: this.fieldNumber(response, 'security.maxLoginAttempts', 5),
        twoFactorAuth: this.fieldBoolean(response, 'security.twoFactorAuth'),
        ipWhitelist: this.field(response, 'security.ipWhitelist').value,
        autoBackup: this.fieldBoolean(response, 'backup.auto', true),
        backupFrequency: this.field(response, 'backup.frequency', 'daily').value,
        backupTime: this.field(response, 'backup.time', '03:00').value,
        backupRetention: this.fieldNumber(response, 'backup.retention', 7),
        backupLocation: this.field(response, 'paths.backup').value,
        emailNotification: this.fieldBoolean(response, 'notification.emailEnabled'),
        smtpServer: this.field(response, 'notification.smtpServer').value,
        smtpPort: this.fieldNumber(response, 'notification.smtpPort', 587),
        smtpUsername: this.field(response, 'notification.smtpUsername').value,
        smtpPassword: '',
        senderEmail: this.field(response, 'notification.senderEmail').value,
        notifyServerStatus: this.fieldBoolean(response, 'notification.serverStatus', true),
        notifyLoginFailures: this.fieldBoolean(response, 'notification.loginFailures', true),
        notifyBackupResults: this.fieldBoolean(response, 'notification.backupResults', true),
        notifySystemUpdates: this.fieldBoolean(response, 'notification.systemUpdates', true)
      };
      this.resetFormErrors();
    },
    async loadSettings(showMessage = true) {
      this.loading = true;
      this.loadError = '';
      try {
        const response = await systemV2API.settings();
        this.populateSettings(response);
        applySystemPreferences(response);
        if (showMessage === true) toast.success('设置已刷新');
        return true;
      } catch (error) {
        this.loadError = error.message || '读取系统设置失败';
        toast.error(this.loadError);
        return false;
      } finally {
        this.loading = false;
        this.initialLoading = false;
      }
    },
    resetFormErrors(fields = Object.keys(this.formErrors)) {
      fields.forEach(field => {
        this.formErrors[field] = '';
      });
    },
    isValidEmail(value) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
    },
    validateEmailFields(includeSender = true) {
      const fields = includeSender
        ? ['smtpServer', 'smtpUsername', 'smtpPassword', 'senderEmail']
        : ['smtpServer', 'smtpUsername', 'smtpPassword'];
      this.resetFormErrors(fields);
      if (!this.settings.emailNotification) return true;

      if (!String(this.settings.smtpServer || '').trim()) this.formErrors.smtpServer = '请输入 SMTP 服务器地址';
      if (!String(this.settings.smtpUsername || '').trim()) this.formErrors.smtpUsername = '请输入 SMTP 用户名';
      if (!String(this.settings.smtpPassword || '').trim() && !this.smtpPasswordConfigured) this.formErrors.smtpPassword = '请输入 SMTP 密码';
      if (includeSender) {
        if (!String(this.settings.senderEmail || '').trim()) this.formErrors.senderEmail = '请输入发件人邮箱';
        else if (!this.isValidEmail(this.settings.senderEmail)) this.formErrors.senderEmail = '请输入正确的邮箱地址';
      }
      return fields.every(field => !this.formErrors[field]);
    },
    validateSettings() {
      this.resetFormErrors();
      if (!String(this.settings.systemName || '').trim()) this.formErrors.systemName = '请输入系统名称';
      if (String(this.settings.adminEmail || '').trim() && !this.isValidEmail(this.settings.adminEmail)) {
        this.formErrors.adminEmail = '请输入正确的邮箱地址';
      }
      if (this.settings.emailNotification && !String(this.settings.adminEmail || '').trim()) {
        this.formErrors.adminEmail = '启用邮件通知时必须填写管理员联系邮箱';
      }
      const emailValid = this.validateEmailFields(true);
      const basicValid = !this.formErrors.systemName && !this.formErrors.adminEmail;
      if (!basicValid) this.activeTab = 'basic';
      else if (!emailValid) this.activeTab = 'notification';
      if (!basicValid || !emailValid) toast.warning('请检查表单中的错误');
      return basicValid && emailValid;
    },
    settingsInput() {
      const currentValues = {
        'ui.systemName': this.settings.systemName,
        'ui.adminEmail': this.settings.adminEmail,
        'ui.language': this.settings.language,
        'ui.timezone': this.settings.timezone,
        'ui.dateFormat': this.settings.dateFormat,
        'ui.theme': this.settings.theme,
        'security.passwordComplexity': String(this.settings.passwordComplexity),
        'security.minPasswordLength': String(this.settings.minPasswordLength),
        'security.sessionTimeout': String(this.settings.sessionTimeout),
        'security.maxLoginAttempts': String(this.settings.maxLoginAttempts),
        'security.ipWhitelist': this.settings.ipWhitelist,
        'backup.auto': String(this.settings.autoBackup),
        'backup.frequency': this.settings.backupFrequency,
        'backup.time': this.settings.backupTime,
        'backup.retention': String(this.settings.backupRetention),
        'paths.backup': this.settings.backupLocation,
        'notification.emailEnabled': String(this.settings.emailNotification),
        'notification.smtpServer': this.settings.smtpServer,
        'notification.smtpPort': String(this.settings.smtpPort),
        'notification.smtpUsername': this.settings.smtpUsername,
        'notification.senderEmail': this.settings.senderEmail,
        'notification.serverStatus': String(this.settings.notifyServerStatus),
        'notification.loginFailures': String(this.settings.notifyLoginFailures),
        'notification.backupResults': String(this.settings.notifyBackupResults),
        'notification.systemUpdates': String(this.settings.notifySystemUpdates)
      };
      const values = editableSystemSettingValues(this.settingsResponse?.fields, currentValues);
      if (this.settings.smtpPassword && this.fieldEditable('notification.smtpPassword')) {
        values['notification.smtpPassword'] = this.settings.smtpPassword;
      }
      return { revision: this.revision, values, clearSecrets: [] };
    },
    async saveSettings() {
      if (!this.validateSettings()) return;
      this.loading = true;
      try {
        const input = this.settingsInput();
        const preview = await systemV2API.previewSettings(input);
        if (!preview.valid) {
          const messages = preview.issues.filter(issue => issue.severity === 'error').map(issue => issue.message);
          throw new Error(messages.join('；') || '系统设置校验失败');
        }
        if (preview.changes.length === 0) {
          toast.info('设置没有变化');
          return;
        }
        const result = await systemV2API.applySettings({ ...input, confirmation: APPLY_CONFIRMATION });
        let backupPolicyError = null;
        if (preview.changes.some(change => change.fieldId.startsWith('backup.'))) {
          try {
            await this.syncBackupPolicies();
          } catch (error) {
            backupPolicyError = error;
          }
        }
        this.populateSettings(result.settings);
        applySystemPreferences(result.settings);
        const refreshed = await this.loadSettings(false);
        const suffix = result.settings.restartRequired ? '；路径或运行参数需要重启服务后生效' : '';
        if (!refreshed) {
          toast.warning('系统设置已保存，但刷新最新设置失败，请稍后手动刷新');
        } else if (backupPolicyError) {
          toast.warning(`系统设置已保存，但房间备份策略同步失败：${backupPolicyError.message || '未知错误'}`);
        } else {
          toast.success(`设置已保存并生效${suffix}`);
        }
      } catch (error) {
        toast.error(error.message || '保存系统设置失败');
      } finally {
        this.loading = false;
      }
    },
    async resetSettings() {
      try {
        await confirmAction('确定放弃当前未保存的修改，并重新读取服务器设置吗？', '重置系统设置', {
          confirmButtonText: '确定重置',
          cancelButtonText: '取消'
        });
        await this.loadSettings(false);
      } catch (error) {
        if (error !== 'cancel' && error !== 'close') toast.error(error.message || '重置系统设置失败');
      }
    },
    backupIntervalMinutes() {
      return { daily: 1440, weekly: 10080, monthly: 43200 }[this.settings.backupFrequency] || 1440;
    },
    nextBackupRun() {
      const [hour, minute] = String(this.settings.backupTime || '03:00').split(':').map(Number);
      const next = new Date();
      next.setHours(hour, minute, 0, 0);
      if (next <= new Date()) next.setDate(next.getDate() + 1);
      return next.toISOString();
    },
    async managedRooms() {
      const response = await roomsV2API.list();
      return (response.items || []).filter(room => room.managed);
    },
    async syncBackupPolicies() {
      const rooms = await this.managedRooms();
      const policy = {
        enabled: this.settings.autoBackup,
        intervalMinutes: this.backupIntervalMinutes(),
        maxSnapshots: this.settings.backupRetention,
        nextRunAt: this.settings.autoBackup ? this.nextBackupRun() : undefined
      };
      await Promise.all(rooms.map(room => backupsV2API.savePolicy(room.id, policy)));
    },
    async handleBackupNow() {
      this.loading = true;
      try {
        const rooms = await this.managedRooms();
        if (rooms.length === 0) throw new Error('没有已接管的房间可以备份');
        const jobs = await Promise.all(rooms.map(room => backupsV2API.create(room.id)));
        await this.waitForJobs(jobs);
        await this.loadBackupHistory();
        toast.success(`已完成 ${rooms.length} 个房间的真实备份`);
      } catch (error) {
        toast.error(error.message || '创建备份失败');
      } finally {
        this.loading = false;
      }
    },
    async waitForJobs(jobs) {
      let current = jobs;
      for (let attempt = 0; attempt < 120; attempt += 1) {
        current = await Promise.all(current.map(job => jobsV2API.get(job.id)));
        if (current.every(job => TERMINAL_SYSTEM_JOB_STATES.has(job.status))) break;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      if (current.some(job => !TERMINAL_SYSTEM_JOB_STATES.has(job.status))) throw new Error('备份任务仍在执行，请稍后查看历史记录');
      const failed = current.find(job => job.status !== 'succeeded');
      if (failed) throw new Error(failed.error?.message || '部分房间备份失败');
    },
    async loadBackupHistory() {
      const response = await roomsV2API.list();
      const rooms = response.items || [];
      const results = await Promise.all(rooms.map(async room => ({ room, backups: await backupsV2API.list(room.id) })));
      this.backupHistory = results.flatMap(({ room, backups }) => (backups.items || []).map(item => ({
        id: item.id,
        name: item.name,
        filename: item.fileName || `${item.name}.zip`,
        size: this.formatBytes(item.size),
        createTime: this.formatDateTime(item.createdAt),
        status: item.status === 'verified' ? 'success' : 'failed',
        roomName: room.name
      }))).sort((first, second) => second.createTime.localeCompare(first.createTime));
    },
    async showBackupHistory() {
      this.loading = true;
      try {
        await this.loadBackupHistory();
        this.backupHistoryVisible = true;
      } catch (error) {
        toast.error(error.message || '读取备份历史失败');
      } finally {
        this.loading = false;
      }
    },
    async downloadBackup(backup) {
      this.loading = true;
      try {
        const response = await fetch(backupsV2API.downloadURL(backup.id), {
          credentials: 'include',
          headers: { 'X-DST-Runtime-Target': getActiveRuntimeTarget().id }
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error?.message || `下载失败（HTTP ${response.status}）`);
        }
        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement('a');
        link.href = url;
        link.download = backup.filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      } catch (error) {
        toast.error(error.message || '下载备份失败');
      } finally {
        this.loading = false;
      }
    },
    async deleteBackup(backup) {
      try {
        await confirmAction(`确定要删除备份：${backup.filename}吗？`, '删除备份', {
          confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning'
        });
        this.loading = true;
        try {
          await backupsV2API.delete(backup.id, backup.name);
          await this.loadBackupHistory();
          toast.success('备份已删除');
        } finally {
          this.loading = false;
        }
      } catch (error) {
        if (error !== 'cancel' && error !== 'close') toast.error(error.message || '删除备份失败');
      }
    },
    async testEmailConnection() {
      if (!this.validateEmailFields(false)) {
        this.activeTab = 'notification';
        toast.warning('请检查 SMTP 连接参数');
        return;
      }
      this.loading = true;
      try {
        const result = await systemV2API.testEmail({
          server: this.settings.smtpServer,
          port: this.settings.smtpPort,
          username: this.settings.smtpUsername,
          password: this.settings.smtpPassword
        });
        toast.success(`SMTP 连接与认证成功（${result.tls ? 'TLS' : '本机明文连接'}）`);
      } catch (error) {
        toast.error(error.details?.reason || error.message || 'SMTP 连接测试失败');
      } finally {
        this.loading = false;
      }
    },

    // 刷新系统状态信息
    refreshSystemStatus() {
      this.statusLoading = true;
      this.statusError = '';

      systemApi.getDashboardStatus()
        .then(res => {
          if (res && res.data && res.status === 200) {
            this.systemStatus = res.data;
            this.statusLoaded = true;
            toast.success('系统状态已刷新');
          } else {
            this.statusError = res?.msg || '未知错误';
            toast.error('获取系统状态失败：' + this.statusError);
          }
        })
        .catch(err => {
          this.statusError = err.message || '未知错误';
          toast.error('获取系统状态失败：' + this.statusError);
        })
        .finally(() => {
          this.statusLoading = false;
        });
    },

    formatBytes(bytes) {
      const value = Number(bytes) || 0;
      if (value < 1024) return `${value} B`;
      if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
      if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`;
      return `${(value / 1024 ** 3).toFixed(1)} GB`;
    },
    formatDateTime(value) {
      if (!value) return '';
      return new Intl.DateTimeFormat('zh-CN', {
        timeZone: this.settings.timezone,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      }).format(new Date(value)).replaceAll('/', '-');
    },
    formatMemory(memory) {
      const value = Number(memory) || 0;
      if (value < 1024) {
        return value.toFixed(0) + ' MB';
      } else {
        return (value / 1024).toFixed(2) + ' GB';
      }
    },
    clampPercent(value) {
      return Math.min(Math.max(Number(value) || 0, 0), 100);
    },
    isCoreOverloaded(usage) {
      return Number(usage) > 70;
    }
  }
};
</script>

<style scoped>
.status-header h2 {
  margin: 0;
  color: var(--foreground);
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
}

.status-header p {
  margin: 2px 0 0;
  color: var(--muted-foreground);
  font-size: 13px;
  line-height: 20px;
}

.settings-tabs-root {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings-tabs-scroll {
  width: 100%;
  overflow-x: auto;
  padding: 0;
  border-bottom: 1px solid var(--border);
  scrollbar-width: thin;
}

.settings-tabs {
  width: max-content;
  min-width: 100%;
  height: auto;
  max-width: none;
  justify-content: flex-start;
  padding: 0 0 8px;
  overflow: visible;
}

.settings-tab-trigger {
  min-height: 32px;
  flex: none;
  padding-right: 12px;
  padding-left: 12px;
}

.settings-tab-content {
  min-width: 0;
  margin: 0;
}

.settings-card > :deep([data-slot='card-header']) {
  border-bottom: 1px solid var(--border);
}

.settings-form {
  max-width: 960px;
}

.settings-form > :deep([data-slot='field'][data-orientation='horizontal']) {
  min-height: 72px;
  padding: 12px 14px;
  background: var(--muted);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.setting-control {
  width: min(100%, 480px);
}

.number-control {
  width: min(100%, 180px);
}

.field-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.settings-card-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.theme-options {
  display: grid;
  width: 100%;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.theme-option {
  display: flex;
  width: 100%;
  min-width: 0;
  height: auto;
  min-height: 80px;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  padding: 12px;
  text-align: left;
  white-space: normal;
}

.theme-option-head {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.theme-option-name {
  min-width: 0;
  overflow-wrap: anywhere;
}

.theme-swatches {
  display: grid;
  grid-template-columns: repeat(4, 28px);
  gap: 6px;
  margin-top: 8px;
}

.theme-swatch {
  width: 28px;
  height: 16px;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, transparent);
  border-radius: 4px;
}

.theme-swatch-sidebar {
  background: var(--theme-sidebar);
}

.theme-swatch-primary {
  background: var(--theme-primary);
}

.theme-swatch-accent {
  background: var(--theme-accent);
}

.theme-swatch-background {
  background: var(--theme-background);
}

.custom-theme-control {
  display: flex;
  min-height: 52px;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.custom-theme-copy {
  min-width: 200px;
  flex: 1;
}

.color-input {
  width: 48px;
  min-width: 48px;
  padding: 3px;
}

.status-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.status-section-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 20px 0 10px;
}

.status-section-heading h3 {
  flex: 0 0 auto;
  margin: 0;
  color: var(--foreground);
  font-size: 14px;
  font-weight: 600;
}

.status-grid {
  display: grid;
  gap: 12px;
}

.system-status-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.process-status-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.status-card-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
}

.status-list > div {
  display: grid;
  grid-template-columns: minmax(84px, auto) minmax(0, 1fr);
  gap: 12px;
}

.status-list dt {
  color: var(--muted-foreground);
}

.status-list dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
  text-align: right;
}

.usage-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
}

.usage-block > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--muted-foreground);
  font-size: 12px;
}

.usage-block strong {
  color: var(--foreground);
  font-weight: 500;
}

.core-usage-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
  margin-top: 16px;
}

.core-usage-item {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
}

.core-usage-label {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 6px;
  color: var(--muted-foreground);
  font-size: 12px;
}

.time-status-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.time-status-list > div {
  grid-template-columns: 1fr;
  gap: 3px;
}

.time-status-list dd {
  text-align: left;
}

.notification-events {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.table-scroll {
  width: 100%;
  overflow-x: auto;
}

.table-actions-head {
  text-align: right;
}

.table-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

@media (min-width: 1280px) {
  .system-status-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .status-header {
    align-items: flex-start;
  }

  .status-header > div {
    min-width: 0;
  }

  .system-status-grid,
  .process-status-grid,
  .notification-events,
  .time-status-list {
    grid-template-columns: 1fr;
  }

  .theme-options {
    grid-template-columns: 1fr;
  }

  .field-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .setting-control,
  .number-control {
    width: 100%;
    max-width: none;
  }
}

@media (max-width: 520px) {
  .status-header {
    flex-direction: column;
  }

  .status-header > button {
    width: 100%;
  }

  .settings-card-footer {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .settings-card-footer > button,
  .field-actions > button {
    min-width: 0;
    flex: 1;
  }
}
</style>

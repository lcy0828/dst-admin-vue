<template>
  <div class="flex min-w-0 flex-col gap-6">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold tracking-normal">{{ $t('systemSettings.title') }}</h1>
        <p class="mt-1 text-sm text-muted-foreground">{{ $t('systemSettings.subtitle') }}</p>
      </div>
      <UiButton variant="outline" size="sm" :disabled="loading" @click="loadSettings()">
        <Spinner v-if="loading" data-icon="inline-start" />
        <RefreshCw v-else data-icon="inline-start" />
        {{ $t('common.actions.refresh') }}
      </UiButton>
    </header>

    <Alert v-if="loadError" variant="destructive"><CircleAlert /><AlertTitle>{{ $t('systemSettings.loadFailed') }}</AlertTitle><AlertDescription>{{ loadError }}</AlertDescription><AlertAction><UiButton size="sm" variant="outline" @click="loadSettings(false)">{{ $t('common.actions.retry') }}</UiButton></AlertAction></Alert>
    <Alert v-if="lockedSettingCount > 0"><CircleAlert /><AlertTitle>{{ $t('systemSettings.environmentManaged') }}</AlertTitle><AlertDescription>{{ $t('systemSettings.environmentManagedDescription', { count: lockedSettingCount }) }}</AlertDescription></Alert>
    <div v-if="initialLoading" class="flex flex-col gap-3"><Skeleton class="h-10 w-full" /><Skeleton class="h-72 w-full" /></div>

    <Tabs v-else v-model="activeTab" class="settings-tabs-root">
      <div class="settings-tabs-scroll">
        <TabsList variant="line" class="settings-tabs">
          <TabsTrigger value="basic" class="settings-tab-trigger"><Settings2 />{{ $t('systemSettings.tabs.basic') }}</TabsTrigger>
          <TabsTrigger value="security" class="settings-tab-trigger"><ShieldCheck />{{ $t('systemSettings.tabs.security') }}</TabsTrigger>
          <TabsTrigger value="backup" class="settings-tab-trigger"><DatabaseBackup />{{ $t('systemSettings.tabs.backup') }}</TabsTrigger>
          <TabsTrigger value="notification" class="settings-tab-trigger"><BellRing />{{ $t('systemSettings.tabs.notification') }}</TabsTrigger>
          <TabsTrigger value="systemStatus" class="settings-tab-trigger"><Activity />{{ $t('systemSettings.tabs.systemStatus') }}</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="basic" class="settings-tab-content">
        <Card size="sm" class="settings-card">
          <CardHeader>
            <CardTitle>{{ $t('systemSettings.tabs.basic') }}</CardTitle>
            <CardDescription>{{ $t('systemSettings.basic.description') }}</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup class="settings-form">
              <Field orientation="responsive" :data-invalid="Boolean(formErrors.systemName)">
                <FieldContent>
                  <FieldLabel for="system-name">{{ $t('systemSettings.basic.systemName') }}</FieldLabel>
                  <FieldError v-if="formErrors.systemName">{{ formErrors.systemName }}</FieldError>
                </FieldContent>
                <UiInput id="system-name" v-model="settings.systemName" class="setting-control" :disabled="!fieldEditable('ui.systemName')" :aria-invalid="Boolean(formErrors.systemName)" :placeholder="$t('systemSettings.basic.systemNamePlaceholder')" @input="formErrors.systemName = ''" />
              </Field>

              <Field orientation="responsive" :data-invalid="Boolean(formErrors.adminEmail)">
                <FieldContent>
                  <FieldLabel for="admin-email">{{ $t('systemSettings.basic.adminEmail') }}</FieldLabel>
                  <FieldDescription>{{ $t('systemSettings.basic.adminEmailDescription') }}</FieldDescription>
                  <FieldError v-if="formErrors.adminEmail">{{ formErrors.adminEmail }}</FieldError>
                </FieldContent>
                <UiInput id="admin-email" v-model="settings.adminEmail" class="setting-control" type="email" :disabled="!fieldEditable('ui.adminEmail')" :aria-invalid="Boolean(formErrors.adminEmail)" :placeholder="$t('systemSettings.basic.adminEmailPlaceholder')" @input="formErrors.adminEmail = ''" />
              </Field>

              <Field orientation="responsive">
                <FieldContent><FieldLabel for="system-language">{{ $t('settings.language.label') }}</FieldLabel></FieldContent>
                <UiSelect v-model="settings.language" :disabled="!fieldEditable('ui.language')" @update:model-value="previewLanguage">
                  <SelectTrigger id="system-language" class="setting-control"><SelectValue :placeholder="$t('settings.language.placeholder')" /></SelectTrigger>
                  <SelectContent><SelectGroup>
                    <SelectItem value="zh-CN">{{ $t('settings.language.zhCN') }}</SelectItem>
                    <SelectItem value="en-US">{{ $t('settings.language.enUS') }}</SelectItem>
                    <SelectItem value="ja-JP" disabled>日本語</SelectItem>
                  </SelectGroup></SelectContent>
                </UiSelect>
              </Field>

              <Field orientation="responsive">
                <FieldContent><FieldLabel for="system-timezone">{{ $t('systemSettings.basic.timezone') }}</FieldLabel></FieldContent>
                <UiSelect v-model="settings.timezone" :disabled="!fieldEditable('ui.timezone')">
                  <SelectTrigger id="system-timezone" class="setting-control"><SelectValue :placeholder="$t('systemSettings.basic.timezonePlaceholder')" /></SelectTrigger>
                  <SelectContent><SelectGroup>
                    <SelectItem value="Asia/Shanghai">{{ $t('systemSettings.basic.timezones.shanghai') }}</SelectItem>
                    <SelectItem value="UTC">{{ $t('systemSettings.basic.timezones.utc') }}</SelectItem>
                    <SelectItem value="America/Los_Angeles">{{ $t('systemSettings.basic.timezones.losAngeles') }}</SelectItem>
                    <SelectItem value="America/New_York">{{ $t('systemSettings.basic.timezones.newYork') }}</SelectItem>
                    <SelectItem value="Europe/Berlin">{{ $t('systemSettings.basic.timezones.berlin') }}</SelectItem>
                    <SelectItem value="Asia/Tokyo">{{ $t('systemSettings.basic.timezones.tokyo') }}</SelectItem>
                  </SelectGroup></SelectContent>
                </UiSelect>
              </Field>

              <Field orientation="responsive">
                <FieldContent><FieldLabel for="date-format">{{ $t('systemSettings.basic.dateFormat') }}</FieldLabel></FieldContent>
                <UiSelect v-model="settings.dateFormat" :disabled="!fieldEditable('ui.dateFormat')">
                  <SelectTrigger id="date-format" class="setting-control"><SelectValue :placeholder="$t('systemSettings.basic.dateFormatPlaceholder')" /></SelectTrigger>
                  <SelectContent><SelectGroup>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="YYYY年MM月DD日">{{ $t('systemSettings.basic.longDateFormat') }}</SelectItem>
                  </SelectGroup></SelectContent>
                </UiSelect>
              </Field>

              <Field>
                <FieldContent>
                  <FieldTitle id="theme-options-label">{{ $t('systemSettings.basic.theme') }}</FieldTitle>
                  <FieldDescription>{{ $t('systemSettings.basic.themeDescription') }}</FieldDescription>
                </FieldContent>
                <ToggleGroup :model-value="selectedThemeId" type="single" class="theme-options" aria-labelledby="theme-options-label" :disabled="!fieldEditable('ui.theme')" @update:model-value="selectThemeById">
                  <ToggleGroupItem v-for="preset in themePresets" :key="preset.id" :value="preset.id" class="theme-option" :style="themeOptionStyle(preset)">
                    <span class="theme-option-head">
                      <span class="theme-option-name">{{ themePresetName(preset) }}</span>
                      <Badge v-if="selectedThemeId === preset.id" variant="secondary">{{ $t('systemSettings.basic.selected') }}</Badge>
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
                    <FieldLabel for="custom-theme-color">{{ $t('systemSettings.basic.customColor') }}</FieldLabel>
                    <FieldDescription>{{ $t(selectedThemeId === 'custom' ? 'systemSettings.basic.customColorActive' : 'systemSettings.basic.customColorPreview') }}</FieldDescription>
                  </div>
                  <UiInput id="custom-theme-color" v-model="settings.theme" class="color-input" type="color" :aria-label="$t('systemSettings.basic.customColorAria')" :disabled="!fieldEditable('ui.theme')" @update:model-value="previewCustomTheme" />
                  <Badge v-if="selectedThemeId === 'custom'" variant="secondary">{{ $t('systemSettings.basic.selected') }}</Badge>
                  <UiButton variant="ghost" size="sm" :disabled="!fieldEditable('ui.theme')" @click="resetDefaultTheme">{{ $t('systemSettings.basic.restoreDefault') }}</UiButton>
                </div>
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter class="settings-card-footer">
            <UiButton variant="outline" :disabled="loading" @click="resetSettings"><RotateCcw data-icon="inline-start" />{{ $t('common.actions.reset') }}</UiButton>
            <UiButton :disabled="loading" @click="saveSettings"><Spinner v-if="loading" data-icon="inline-start" /><Save v-else data-icon="inline-start" />{{ $t('systemSettings.actions.save') }}</UiButton>
          </CardFooter>
        </Card>
      </TabsContent>

      <TabsContent value="security" class="settings-tab-content">
        <Card size="sm" class="settings-card">
          <CardHeader><CardTitle>{{ $t('systemSettings.tabs.security') }}</CardTitle><CardDescription>{{ $t('systemSettings.security.description') }}</CardDescription></CardHeader>
          <CardContent>
            <FieldGroup class="settings-form">
              <Field orientation="horizontal">
                <FieldContent><FieldLabel for="password-complexity">{{ $t('systemSettings.security.passwordComplexity') }}</FieldLabel><FieldDescription>{{ $t('systemSettings.security.passwordComplexityDescription') }}</FieldDescription></FieldContent>
                <UiSwitch id="password-complexity" v-model="settings.passwordComplexity" :disabled="!fieldEditable('security.passwordComplexity')" />
              </Field>
              <Field orientation="responsive" :data-disabled="!fieldEditable('security.minPasswordLength')">
                <FieldContent><FieldLabel for="min-password-length">{{ $t('systemSettings.security.minPasswordLength') }}</FieldLabel><FieldDescription>{{ $t('systemSettings.security.minPasswordLengthDescription') }}</FieldDescription></FieldContent>
                <UiInput id="min-password-length" class="number-control" type="number" min="6" max="20" :disabled="!fieldEditable('security.minPasswordLength')" :model-value="String(settings.minPasswordLength)" @update:model-value="settings.minPasswordLength = Number($event)" />
              </Field>
              <Field orientation="responsive">
                <FieldContent><FieldLabel for="session-timeout">{{ $t('systemSettings.security.sessionTimeout') }}</FieldLabel><FieldDescription>{{ $t('systemSettings.security.sessionTimeoutDescription') }}</FieldDescription></FieldContent>
                <UiInput id="session-timeout" class="number-control" type="number" min="5" max="1440" :disabled="!fieldEditable('security.sessionTimeout')" :model-value="String(settings.sessionTimeout)" @update:model-value="settings.sessionTimeout = Number($event)" />
              </Field>
              <Field orientation="responsive">
                <FieldContent><FieldLabel for="max-login-attempts">{{ $t('systemSettings.security.maxLoginAttempts') }}</FieldLabel><FieldDescription>{{ $t('systemSettings.security.maxLoginAttemptsDescription') }}</FieldDescription></FieldContent>
                <UiInput id="max-login-attempts" class="number-control" type="number" min="3" max="10" :disabled="!fieldEditable('security.maxLoginAttempts')" :model-value="String(settings.maxLoginAttempts)" @update:model-value="settings.maxLoginAttempts = Number($event)" />
              </Field>
              <Field orientation="horizontal" data-disabled>
                <FieldContent><FieldLabel for="two-factor-auth">{{ $t('systemSettings.security.twoFactor') }}</FieldLabel><FieldDescription>{{ $t('systemSettings.security.twoFactorDescription') }}</FieldDescription></FieldContent>
                <UiSwitch id="two-factor-auth" v-model="settings.twoFactorAuth" disabled />
              </Field>
              <Field>
                <FieldLabel for="ip-whitelist">{{ $t('systemSettings.security.ipWhitelist') }}</FieldLabel>
                <UiTextarea id="ip-whitelist" v-model="settings.ipWhitelist" rows="3" :disabled="!fieldEditable('security.ipWhitelist')" :placeholder="$t('systemSettings.security.ipWhitelistPlaceholder')" />
                <FieldDescription>{{ $t('systemSettings.security.ipWhitelistDescription') }}</FieldDescription>
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter class="settings-card-footer">
            <UiButton variant="outline" :disabled="loading" @click="resetSettings"><RotateCcw data-icon="inline-start" />{{ $t('common.actions.reset') }}</UiButton>
            <UiButton :disabled="loading" @click="saveSettings"><Spinner v-if="loading" data-icon="inline-start" /><Save v-else data-icon="inline-start" />{{ $t('systemSettings.actions.save') }}</UiButton>
          </CardFooter>
        </Card>
      </TabsContent>

      <TabsContent value="backup" class="settings-tab-content">
        <Card size="sm" class="settings-card">
          <CardHeader><CardTitle>{{ $t('systemSettings.tabs.backup') }}</CardTitle><CardDescription>{{ $t('systemSettings.backup.description') }}</CardDescription></CardHeader>
          <CardContent>
            <FieldGroup class="settings-form">
              <Field orientation="horizontal">
                <FieldContent><FieldLabel for="auto-backup">{{ $t('systemSettings.backup.auto') }}</FieldLabel><FieldDescription>{{ $t('systemSettings.backup.autoDescription') }}</FieldDescription></FieldContent>
                <UiSwitch id="auto-backup" v-model="settings.autoBackup" :disabled="!fieldEditable('backup.auto')" />
              </Field>
              <Field orientation="responsive" :data-disabled="!settings.autoBackup">
                <FieldContent><FieldLabel for="backup-frequency">{{ $t('systemSettings.backup.frequency') }}</FieldLabel></FieldContent>
                <UiSelect v-model="settings.backupFrequency" :disabled="!settings.autoBackup || !fieldEditable('backup.frequency')">
                  <SelectTrigger id="backup-frequency" class="setting-control"><SelectValue :placeholder="$t('systemSettings.backup.frequencyPlaceholder')" /></SelectTrigger>
                  <SelectContent><SelectGroup><SelectItem value="daily">{{ $t('systemSettings.backup.daily') }}</SelectItem><SelectItem value="weekly">{{ $t('systemSettings.backup.weekly') }}</SelectItem><SelectItem value="monthly">{{ $t('systemSettings.backup.monthly') }}</SelectItem></SelectGroup></SelectContent>
                </UiSelect>
              </Field>
              <Field orientation="responsive" :data-disabled="!settings.autoBackup">
                <FieldContent><FieldLabel for="backup-time">{{ $t('systemSettings.backup.time') }}</FieldLabel></FieldContent>
                <UiInput id="backup-time" v-model="settings.backupTime" class="setting-control" type="time" :disabled="!settings.autoBackup || !fieldEditable('backup.time')" />
              </Field>
              <Field orientation="responsive" :data-disabled="!settings.autoBackup">
                <FieldContent><FieldLabel for="backup-retention">{{ $t('systemSettings.backup.retention') }}</FieldLabel><FieldDescription>{{ $t('systemSettings.backup.retentionDescription') }}</FieldDescription></FieldContent>
                <UiInput id="backup-retention" class="number-control" type="number" min="1" max="100" :disabled="!settings.autoBackup || !fieldEditable('backup.retention')" :model-value="String(settings.backupRetention)" @update:model-value="settings.backupRetention = Number($event)" />
              </Field>
              <Field orientation="responsive" :data-disabled="!settings.autoBackup">
                <FieldContent><FieldLabel for="backup-location">{{ $t('systemSettings.backup.location') }}</FieldLabel><FieldDescription>{{ $t('systemSettings.backup.locationDescription') }}</FieldDescription></FieldContent>
                <UiInput id="backup-location" v-model="settings.backupLocation" class="setting-control" :disabled="!settings.autoBackup || !fieldEditable('paths.backup')" :placeholder="$t('systemSettings.backup.locationPlaceholder')" />
              </Field>
              <FieldSeparator>{{ $t('systemSettings.backup.manual') }}</FieldSeparator>
              <Field orientation="responsive">
                <FieldContent><FieldTitle>{{ $t('systemSettings.backup.runNow') }}</FieldTitle><FieldDescription>{{ $t('systemSettings.backup.runNowDescription') }}</FieldDescription></FieldContent>
                <div class="field-actions">
                  <UiButton :disabled="loading" @click="handleBackupNow"><DatabaseBackup data-icon="inline-start" />{{ $t('systemSettings.backup.createNow') }}</UiButton>
                  <UiButton variant="outline" :disabled="loading" @click="showBackupHistory"><History data-icon="inline-start" />{{ $t('systemSettings.backup.viewHistory') }}</UiButton>
                </div>
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter class="settings-card-footer">
            <UiButton variant="outline" :disabled="loading" @click="resetSettings"><RotateCcw data-icon="inline-start" />{{ $t('common.actions.reset') }}</UiButton>
            <UiButton :disabled="loading" @click="saveSettings"><Spinner v-if="loading" data-icon="inline-start" /><Save v-else data-icon="inline-start" />{{ $t('systemSettings.actions.save') }}</UiButton>
          </CardFooter>
        </Card>
      </TabsContent>

      <TabsContent value="notification" class="settings-tab-content">
        <Card size="sm" class="settings-card">
          <CardHeader><CardTitle>{{ $t('systemSettings.tabs.notification') }}</CardTitle><CardDescription>{{ $t('systemSettings.notification.description') }}</CardDescription></CardHeader>
          <CardContent>
            <FieldGroup class="settings-form">
              <Field orientation="horizontal">
                <FieldContent><FieldLabel for="email-notification">{{ $t('systemSettings.notification.emailEnabled') }}</FieldLabel><FieldDescription>{{ $t('systemSettings.notification.emailEnabledDescription') }}</FieldDescription></FieldContent>
                <UiSwitch id="email-notification" v-model="settings.emailNotification" :disabled="!fieldEditable('notification.emailEnabled')" />
              </Field>
              <Field orientation="responsive" :data-disabled="!settings.emailNotification" :data-invalid="Boolean(formErrors.smtpServer)">
                <FieldContent><FieldLabel for="smtp-server">{{ $t('systemSettings.notification.smtpServer') }}</FieldLabel><FieldError v-if="formErrors.smtpServer">{{ formErrors.smtpServer }}</FieldError></FieldContent>
                <UiInput id="smtp-server" v-model="settings.smtpServer" class="setting-control" :disabled="!settings.emailNotification || !fieldEditable('notification.smtpServer')" :aria-invalid="Boolean(formErrors.smtpServer)" :placeholder="$t('systemSettings.notification.smtpServerPlaceholder')" @input="formErrors.smtpServer = ''" />
              </Field>
              <Field orientation="responsive" :data-disabled="!settings.emailNotification">
                <FieldContent><FieldLabel for="smtp-port">{{ $t('systemSettings.notification.smtpPort') }}</FieldLabel></FieldContent>
                <UiInput id="smtp-port" class="number-control" type="number" min="1" max="65535" :disabled="!settings.emailNotification || !fieldEditable('notification.smtpPort')" :model-value="String(settings.smtpPort)" @update:model-value="settings.smtpPort = Number($event)" />
              </Field>
              <Field orientation="responsive" :data-disabled="!settings.emailNotification" :data-invalid="Boolean(formErrors.smtpUsername)">
                <FieldContent><FieldLabel for="smtp-username">{{ $t('systemSettings.notification.smtpUsername') }}</FieldLabel><FieldError v-if="formErrors.smtpUsername">{{ formErrors.smtpUsername }}</FieldError></FieldContent>
                <UiInput id="smtp-username" v-model="settings.smtpUsername" class="setting-control" :disabled="!settings.emailNotification || !fieldEditable('notification.smtpUsername')" :aria-invalid="Boolean(formErrors.smtpUsername)" :placeholder="$t('systemSettings.notification.smtpUsernamePlaceholder')" @input="formErrors.smtpUsername = ''" />
              </Field>
              <Field orientation="responsive" :data-disabled="!settings.emailNotification" :data-invalid="Boolean(formErrors.smtpPassword)">
                <FieldContent><FieldLabel for="smtp-password">{{ $t('systemSettings.notification.smtpPassword') }}</FieldLabel><FieldError v-if="formErrors.smtpPassword">{{ formErrors.smtpPassword }}</FieldError></FieldContent>
                <UiInput id="smtp-password" v-model="settings.smtpPassword" class="setting-control" type="password" :disabled="!settings.emailNotification || !fieldEditable('notification.smtpPassword')" :aria-invalid="Boolean(formErrors.smtpPassword)" :placeholder="$t(smtpPasswordConfigured ? 'systemSettings.notification.smtpPasswordConfigured' : 'systemSettings.notification.smtpPasswordPlaceholder')" @input="formErrors.smtpPassword = ''" />
              </Field>
              <Field orientation="responsive" :data-disabled="!settings.emailNotification" :data-invalid="Boolean(formErrors.senderEmail)">
                <FieldContent><FieldLabel for="sender-email">{{ $t('systemSettings.notification.senderEmail') }}</FieldLabel><FieldError v-if="formErrors.senderEmail">{{ formErrors.senderEmail }}</FieldError></FieldContent>
                <UiInput id="sender-email" v-model="settings.senderEmail" class="setting-control" type="email" :disabled="!settings.emailNotification || !fieldEditable('notification.senderEmail')" :aria-invalid="Boolean(formErrors.senderEmail)" :placeholder="$t('systemSettings.notification.senderEmailPlaceholder')" @input="formErrors.senderEmail = ''" />
              </Field>
              <Field orientation="responsive" :data-disabled="!settings.emailNotification">
                <FieldContent><FieldTitle>{{ $t('systemSettings.notification.connectionCheck') }}</FieldTitle><FieldDescription>{{ $t('systemSettings.notification.connectionCheckDescription') }}</FieldDescription></FieldContent>
                <UiButton variant="outline" :disabled="loading || !settings.emailNotification" @click="testEmailConnection"><Send data-icon="inline-start" />{{ $t('systemSettings.notification.testConnection') }}</UiButton>
              </Field>
              <FieldSeparator>{{ $t('systemSettings.notification.events') }}</FieldSeparator>
              <FieldGroup class="notification-events">
                <Field orientation="horizontal" data-disabled><FieldLabel for="notify-server-status">{{ $t('systemSettings.notification.serverStatus') }}</FieldLabel><UiSwitch id="notify-server-status" v-model="settings.notifyServerStatus" disabled /></Field>
                <Field orientation="horizontal" data-disabled><FieldLabel for="notify-login-failures">{{ $t('systemSettings.notification.loginFailures') }}</FieldLabel><UiSwitch id="notify-login-failures" v-model="settings.notifyLoginFailures" disabled /></Field>
                <Field orientation="horizontal" data-disabled><FieldLabel for="notify-backup-results">{{ $t('systemSettings.notification.backupResults') }}</FieldLabel><UiSwitch id="notify-backup-results" v-model="settings.notifyBackupResults" disabled /></Field>
                <Field orientation="horizontal" data-disabled><FieldLabel for="notify-system-updates">{{ $t('systemSettings.notification.systemUpdates') }}</FieldLabel><UiSwitch id="notify-system-updates" v-model="settings.notifySystemUpdates" disabled /></Field>
              </FieldGroup>
            </FieldGroup>
          </CardContent>
          <CardFooter class="settings-card-footer">
            <UiButton variant="outline" :disabled="loading" @click="resetSettings"><RotateCcw data-icon="inline-start" />{{ $t('common.actions.reset') }}</UiButton>
            <UiButton :disabled="loading" @click="saveSettings"><Spinner v-if="loading" data-icon="inline-start" /><Save v-else data-icon="inline-start" />{{ $t('systemSettings.actions.save') }}</UiButton>
          </CardFooter>
        </Card>
      </TabsContent>

      <TabsContent value="systemStatus" class="settings-tab-content">
        <div class="status-header">
          <div><h2>{{ $t('systemSettings.monitor.title') }}</h2><p>{{ $t('systemSettings.monitor.description') }}</p></div>
          <UiButton size="sm" :disabled="statusLoading" @click="refreshSystemStatus"><Spinner v-if="statusLoading" data-icon="inline-start" /><RefreshCw v-else data-icon="inline-start" />{{ $t('systemSettings.monitor.refresh') }}</UiButton>
        </div>

        <Alert v-if="statusError" variant="destructive" class="mt-4"><CircleAlert /><AlertTitle>{{ $t('systemSettings.monitor.loadFailed') }}</AlertTitle><AlertDescription>{{ statusError }}</AlertDescription></Alert>
        <div v-if="statusLoading" class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Skeleton v-for="index in 4" :key="index" class="h-52 w-full" /></div>
        <template v-else-if="statusLoaded">
        <div class="status-section-heading"><h3>{{ $t('systemSettings.monitor.system') }}</h3><Separator /></div>
        <div class="status-grid system-status-grid">
          <Card>
            <CardHeader><CardTitle class="status-card-title"><Cpu />{{ $t('systemSettings.monitor.cpu') }}</CardTitle><CardDescription>{{ systemStatus.cpu_model }}</CardDescription></CardHeader>
            <CardContent class="status-card-content">
              <dl class="status-list"><div><dt>{{ $t('systemSettings.monitor.frequency') }}</dt><dd>{{ systemStatus.cpu_mhz }} MHz</dd></div><div><dt>{{ $t('systemSettings.monitor.physicalCores') }}</dt><dd>{{ systemStatus.cpu_cores }}</dd></div><div><dt>{{ $t('systemSettings.monitor.logicalCores') }}</dt><dd>{{ systemStatus.cpu_threads }}</dd></div></dl>
              <div class="usage-block"><div><span>{{ $t('systemSettings.monitor.usage') }}</span><strong>{{ clampPercent(systemStatus.cpu_usage).toFixed(1) }}%</strong></div><UiProgress :model-value="clampPercent(systemStatus.cpu_usage)" :aria-label="$t('systemSettings.monitor.cpuUsageAria')" /></div>
              <div v-if="(systemStatus.cpu_core_usage || []).length" class="core-usage-container">
                <div v-for="(usage, index) in (systemStatus.cpu_core_usage || [])" :key="index" class="core-usage-item">
                  <div class="core-usage-label"><span>{{ $t('systemSettings.monitor.core', { index }) }}</span><Badge v-if="isCoreOverloaded(usage)" variant="destructive">{{ $t('systemSettings.monitor.highLoad') }}</Badge><span>{{ Number(usage).toFixed(2) }}%</span></div>
                  <UiProgress :model-value="clampPercent(usage)" :aria-label="$t('systemSettings.monitor.coreUsageAria', { index })" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle class="status-card-title"><Activity />{{ $t('systemSettings.monitor.systemLoad') }}</CardTitle><CardDescription>{{ systemStatus.hostname }}</CardDescription></CardHeader>
            <CardContent><dl class="status-list"><div><dt>{{ $t('systemSettings.monitor.oneMinute') }}</dt><dd>{{ systemStatus.cpu_load1 }}</dd></div><div><dt>{{ $t('systemSettings.monitor.fiveMinutes') }}</dt><dd>{{ systemStatus.cpu_load5 }}</dd></div><div><dt>{{ $t('systemSettings.monitor.fifteenMinutes') }}</dt><dd>{{ systemStatus.cpu_load15 }}</dd></div><div><dt>{{ $t('systemSettings.monitor.os') }}</dt><dd>{{ systemStatus.os_info }}</dd></div></dl></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle class="status-card-title"><MemoryStick />{{ $t('systemSettings.monitor.memory') }}</CardTitle><CardDescription>{{ $t('systemSettings.monitor.physicalMemory') }}</CardDescription></CardHeader>
            <CardContent><dl class="status-list"><div><dt>{{ $t('systemSettings.monitor.totalMemory') }}</dt><dd>{{ formatMemory(systemStatus.total_memory) }}</dd></div><div><dt>{{ $t('systemSettings.monitor.usedMemory') }}</dt><dd>{{ formatMemory(systemStatus.used_memory) }}</dd></div><div><dt>{{ $t('systemSettings.monitor.freeMemory') }}</dt><dd>{{ formatMemory(systemStatus.free_memory) }}</dd></div></dl><div class="usage-block"><div><span>{{ $t('systemSettings.monitor.usage') }}</span><strong>{{ clampPercent(systemStatus.memory_usage).toFixed(1) }}%</strong></div><UiProgress :model-value="clampPercent(systemStatus.memory_usage)" :aria-label="$t('systemSettings.monitor.memoryUsageAria')" /></div></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle class="status-card-title"><HardDrive />{{ $t('systemSettings.monitor.disk') }}</CardTitle><CardDescription>{{ $t('systemSettings.monitor.diskDescription') }}</CardDescription></CardHeader>
            <CardContent><dl class="status-list"><div><dt>{{ $t('systemSettings.monitor.totalSpace') }}</dt><dd>{{ systemStatus.total_disk }} GB</dd></div><div><dt>{{ $t('systemSettings.monitor.usedSpace') }}</dt><dd>{{ systemStatus.used_disk }} GB</dd></div><div><dt>{{ $t('systemSettings.monitor.freeSpace') }}</dt><dd>{{ systemStatus.free_disk }} GB</dd></div></dl><div class="usage-block"><div><span>{{ $t('systemSettings.monitor.usage') }}</span><strong>{{ clampPercent(systemStatus.disk_usage).toFixed(1) }}%</strong></div><UiProgress :model-value="clampPercent(systemStatus.disk_usage)" :aria-label="$t('systemSettings.monitor.diskUsageAria')" /></div></CardContent>
          </Card>
        </div>

        <div class="status-section-heading"><h3>{{ $t('systemSettings.monitor.processSection') }}</h3><Separator /></div>
        <div class="status-grid process-status-grid">
          <Card>
            <CardHeader><CardTitle class="status-card-title"><ChartNoAxesCombined />{{ $t('systemSettings.monitor.process') }}</CardTitle><CardDescription>{{ $t('systemSettings.monitor.processDescription') }}</CardDescription></CardHeader>
            <CardContent><dl class="status-list"><div><dt>{{ $t('systemSettings.monitor.processId') }}</dt><dd>{{ systemStatus.process_id }}</dd></div><div><dt>{{ $t('systemSettings.monitor.uptime') }}</dt><dd>{{ formatSystemDuration(systemStatus.process_uptime_seconds ?? systemStatus.process_uptime, systemStatus.process_uptime_fmt) }}</dd></div><div><dt>{{ $t('systemSettings.monitor.rss') }}</dt><dd>{{ systemStatus.process_memory_rss }} MB</dd></div><div><dt>{{ $t('systemSettings.monitor.vms') }}</dt><dd>{{ systemStatus.process_memory_vms }} MB</dd></div><div><dt>{{ $t('systemSettings.monitor.threads') }}</dt><dd>{{ systemStatus.process_threads }}</dd></div></dl><div class="usage-block"><div><span>{{ $t('systemSettings.monitor.processCpuUsage') }}</span><strong>{{ clampPercent(systemStatus.process_cpu_usage).toFixed(1) }}%</strong></div><UiProgress :model-value="clampPercent(systemStatus.process_cpu_usage)" :aria-label="$t('systemSettings.monitor.processCpuUsageAria')" /></div></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle class="status-card-title"><CodeXml />{{ $t('systemSettings.monitor.goRuntime') }}</CardTitle><CardDescription>{{ systemStatus.go_version }}</CardDescription></CardHeader>
            <CardContent><dl class="status-list"><div><dt>Goroutines</dt><dd>{{ systemStatus.go_routines }}</dd></div><div><dt>{{ $t('systemSettings.monitor.heapAllocated') }}</dt><dd>{{ systemStatus.go_memory_alloc }} MB</dd></div><div><dt>{{ $t('systemSettings.monitor.systemAllocated') }}</dt><dd>{{ systemStatus.go_memory_sys }} MB</dd></div><div><dt>{{ $t('systemSettings.monitor.heapObjects') }}</dt><dd>{{ systemStatus.go_memory_heap_objs }}</dd></div><div><dt>{{ $t('systemSettings.monitor.gcPause') }}</dt><dd>{{ (systemStatus.go_gc_pause / 1000000).toFixed(2) }} ms</dd></div><div><dt>{{ $t('systemSettings.monitor.gcRuns') }}</dt><dd>{{ systemStatus.go_gc_runs }}</dd></div></dl></CardContent>
          </Card>
        </div>

        <div class="status-section-heading"><h3>{{ $t('systemSettings.monitor.timeSection') }}</h3><Separator /></div>
        <Card>
          <CardHeader><CardTitle class="status-card-title"><Clock3 />{{ $t('systemSettings.monitor.time') }}</CardTitle><CardDescription>{{ $t('systemSettings.monitor.timeDescription') }}</CardDescription></CardHeader>
          <CardContent><dl class="status-list time-status-list"><div><dt>{{ $t('systemSettings.monitor.systemUptime') }}</dt><dd>{{ formatSystemDuration(systemStatus.uptime_seconds ?? systemStatus.uptime, systemStatus.uptime_formatted) }}</dd></div><div><dt>{{ $t('systemSettings.monitor.currentTime') }}</dt><dd>{{ systemStatus.current_time }}</dd></div><div><dt>{{ $t('systemSettings.monitor.startTime') }}</dt><dd>{{ systemStatus.start_time }}</dd></div></dl></CardContent>
        </Card>
        </template>
      </TabsContent>
    </Tabs>

    <UiDialog v-model:open="backupHistoryVisible">
      <DialogScrollContent class="sm:max-w-4xl">
        <DialogHeader><DialogTitle>{{ $t('systemSettings.history.title') }}</DialogTitle><DialogDescription>{{ $t('systemSettings.history.description') }}</DialogDescription></DialogHeader>
        <div class="table-scroll">
          <ShadcnTable>
            <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>{{ $t('systemSettings.history.room') }}</TableHead><TableHead>{{ $t('systemSettings.history.filename') }}</TableHead><TableHead>{{ $t('systemSettings.history.size') }}</TableHead><TableHead>{{ $t('systemSettings.history.createdAt') }}</TableHead><TableHead>{{ $t('systemSettings.history.status') }}</TableHead><TableHead class="table-actions-head">{{ $t('systemSettings.history.actions') }}</TableHead></TableRow></TableHeader>
            <TableBody>
              <TableRow v-for="backup in backupHistory" :key="backup.id"><TableCell>{{ backup.id }}</TableCell><TableCell>{{ backup.roomName }}</TableCell><TableCell>{{ backup.filename }}</TableCell><TableCell>{{ backup.size }}</TableCell><TableCell>{{ backup.createTime }}</TableCell><TableCell><Badge :variant="backup.status === 'success' ? 'secondary' : 'destructive'">{{ $t(backup.status === 'success' ? 'systemSettings.history.success' : 'systemSettings.history.failed') }}</Badge></TableCell><TableCell><div class="table-actions"><UiButton variant="outline" size="sm" :disabled="loading" @click="downloadBackup(backup)"><Download data-icon="inline-start" />{{ $t('systemSettings.history.download') }}</UiButton><UiButton variant="destructive" size="sm" :disabled="loading" @click="deleteBackup(backup)"><Trash2 data-icon="inline-start" />{{ $t('common.actions.delete') }}</UiButton></div></TableCell></TableRow>
              <TableEmpty v-if="backupHistory.length === 0" :colspan="7">
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>{{ $t('systemSettings.history.empty') }}</EmptyTitle>
                    <EmptyDescription>{{ $t('systemSettings.history.emptyDescription') }}</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </TableEmpty>
            </TableBody>
          </ShadcnTable>
        </div>
        <DialogFooter><UiButton variant="outline" @click="backupHistoryVisible = false">{{ $t('common.actions.close') }}</UiButton></DialogFooter>
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
import { formatDurationSeconds } from '@/lib/localeFormatters.mjs';
import { DEFAULT_THEME_ID, THEME_PRESETS, normalizeThemeColor, resolveThemePreset, themePresetById } from '@/theme/themePresets';
import { applySystemPreferences, previewSystemLanguage, previewSystemTheme } from '@/utils/systemPreferences';
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
        theme: themePresetById(DEFAULT_THEME_ID).primary,

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
        uptime_seconds: null,
        uptime_formatted: '',
        go_version: '',
        go_routines: 0,
        process_id: 0,
        process_uptime: 0,
        process_uptime_seconds: null,
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
    formatSystemDuration(seconds, fallback = '--') {
      return formatDurationSeconds(seconds, (key, values) => this.$t(key, values), fallback || '--');
    },
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
      return normalizeThemeColor(this.field(response, 'ui.theme', themePresetById(DEFAULT_THEME_ID).primary).value);
    },
    themeOptionStyle(preset) {
      return {
        '--theme-primary': preset.primary,
        '--theme-accent': preset.accent,
        '--theme-sidebar': preset.sidebar,
        '--theme-background': preset.background
      };
    },
    themePresetName(preset) {
      const id = preset?.id || 'custom';
      const key = `systemSettings.basic.themeNames.${id}`;
      return this.$te(key) ? this.$t(key) : preset?.name || id;
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
    previewLanguage(value) {
      if (!value) return;
      this.settings.language = value;
      previewSystemLanguage(value);
    },
    resetDefaultTheme() {
      this.selectTheme(themePresetById(DEFAULT_THEME_ID));
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
        if (showMessage === true) toast.success(this.$t('systemSettings.feedback.refreshed'));
        return true;
      } catch (error) {
        this.loadError = error.message || this.$t('systemSettings.feedback.loadFailed');
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

      if (!String(this.settings.smtpServer || '').trim()) this.formErrors.smtpServer = this.$t('systemSettings.validation.smtpServerRequired');
      if (!String(this.settings.smtpUsername || '').trim()) this.formErrors.smtpUsername = this.$t('systemSettings.validation.smtpUsernameRequired');
      if (!String(this.settings.smtpPassword || '').trim() && !this.smtpPasswordConfigured) this.formErrors.smtpPassword = this.$t('systemSettings.validation.smtpPasswordRequired');
      if (includeSender) {
        if (!String(this.settings.senderEmail || '').trim()) this.formErrors.senderEmail = this.$t('systemSettings.validation.senderEmailRequired');
        else if (!this.isValidEmail(this.settings.senderEmail)) this.formErrors.senderEmail = this.$t('systemSettings.validation.emailInvalid');
      }
      return fields.every(field => !this.formErrors[field]);
    },
    validateSettings() {
      this.resetFormErrors();
      if (!String(this.settings.systemName || '').trim()) this.formErrors.systemName = this.$t('systemSettings.validation.systemNameRequired');
      if (String(this.settings.adminEmail || '').trim() && !this.isValidEmail(this.settings.adminEmail)) {
        this.formErrors.adminEmail = this.$t('systemSettings.validation.emailInvalid');
      }
      if (this.settings.emailNotification && !String(this.settings.adminEmail || '').trim()) {
        this.formErrors.adminEmail = this.$t('systemSettings.validation.adminEmailRequired');
      }
      const emailValid = this.validateEmailFields(true);
      const basicValid = !this.formErrors.systemName && !this.formErrors.adminEmail;
      if (!basicValid) this.activeTab = 'basic';
      else if (!emailValid) this.activeTab = 'notification';
      if (!basicValid || !emailValid) toast.warning(this.$t('systemSettings.validation.checkForm'));
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
          throw new Error(messages.join('; ') || this.$t('systemSettings.validation.settingsInvalid'));
        }
        if (preview.changes.length === 0) {
          toast.info(this.$t('systemSettings.feedback.unchanged'));
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
        if (!refreshed) {
          toast.warning(this.$t('systemSettings.feedback.refreshAfterSaveFailed'));
        } else if (backupPolicyError) {
          toast.warning(this.$t('systemSettings.feedback.backupSyncFailed', { error: backupPolicyError.message || this.$t('common.errors.unknown') }));
        } else {
          toast.success(result.settings.restartRequired
            ? this.$t('systemSettings.feedback.savedRestartRequired', { reason: this.$t('systemSettings.feedback.restartRequired') })
            : this.$t('systemSettings.feedback.saved'));
        }
      } catch (error) {
        toast.error(error.message || this.$t('systemSettings.feedback.saveFailed'));
      } finally {
        this.loading = false;
      }
    },
    async resetSettings() {
      try {
        await confirmAction(this.$t('systemSettings.feedback.resetConfirm'), this.$t('systemSettings.feedback.resetTitle'), {
          confirmButtonText: this.$t('systemSettings.feedback.resetConfirmButton'),
          cancelButtonText: this.$t('common.actions.cancel')
        });
        await this.loadSettings(false);
      } catch (error) {
        if (error !== 'cancel' && error !== 'close') toast.error(error.message || this.$t('systemSettings.feedback.resetFailed'));
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
        if (rooms.length === 0) throw new Error(this.$t('systemSettings.feedback.noManagedRooms'));
        const jobs = await Promise.all(rooms.map(room => backupsV2API.create(room.id)));
        await this.waitForJobs(jobs);
        await this.loadBackupHistory();
        toast.success(this.$t('systemSettings.feedback.backupCompleted', { count: rooms.length }));
      } catch (error) {
        toast.error(error.message || this.$t('systemSettings.feedback.backupCreateFailed'));
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
      if (current.some(job => !TERMINAL_SYSTEM_JOB_STATES.has(job.status))) throw new Error(this.$t('systemSettings.feedback.backupRunning'));
      const failed = current.find(job => job.status !== 'succeeded');
      if (failed) throw new Error(failed.error?.message || this.$t('systemSettings.feedback.backupPartialFailure'));
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
        toast.error(error.message || this.$t('systemSettings.feedback.historyLoadFailed'));
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
          throw new Error(payload?.error?.message || this.$t('systemSettings.feedback.downloadHttpFailed', { status: response.status }));
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
        toast.error(error.message || this.$t('systemSettings.feedback.downloadFailed'));
      } finally {
        this.loading = false;
      }
    },
    async deleteBackup(backup) {
      try {
        await confirmAction(this.$t('systemSettings.feedback.deleteConfirm', { filename: backup.filename }), this.$t('systemSettings.feedback.deleteTitle'), {
          confirmButtonText: this.$t('common.actions.delete'), cancelButtonText: this.$t('common.actions.cancel'), type: 'warning'
        });
        this.loading = true;
        try {
          await backupsV2API.delete(backup.id, backup.name);
          await this.loadBackupHistory();
          toast.success(this.$t('systemSettings.feedback.deleted'));
        } finally {
          this.loading = false;
        }
      } catch (error) {
        if (error !== 'cancel' && error !== 'close') toast.error(error.message || this.$t('systemSettings.feedback.deleteFailed'));
      }
    },
    async testEmailConnection() {
      if (!this.validateEmailFields(false)) {
        this.activeTab = 'notification';
        toast.warning(this.$t('systemSettings.feedback.smtpCheckForm'));
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
        toast.success(this.$t('systemSettings.feedback.smtpSucceeded', { transport: result.tls ? 'TLS' : this.$t('systemSettings.feedback.localPlaintext') }));
      } catch (error) {
        toast.error(error.details?.reason || error.message || this.$t('systemSettings.feedback.smtpFailed'));
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
            toast.success(this.$t('systemSettings.feedback.statusRefreshed'));
          } else {
            this.statusError = res?.msg || this.$t('common.errors.unknown');
            toast.error(this.$t('systemSettings.feedback.statusLoadFailed', { error: this.statusError }));
          }
        })
        .catch(err => {
          this.statusError = err.message || this.$t('common.errors.unknown');
          toast.error(this.$t('systemSettings.feedback.statusLoadFailed', { error: this.statusError }));
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
      return new Intl.DateTimeFormat(this.settings.language || 'zh-CN', {
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

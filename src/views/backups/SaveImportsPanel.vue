<template>
  <div class="flex min-w-0 flex-col gap-4">
    <Alert v-if="!isLocalTarget" variant="destructive">
      <ServerOff />
      <AlertTitle>{{ t('backups.imports.localOnly.title') }}</AlertTitle>
      <AlertDescription>{{ t('backups.imports.localOnly.description') }}</AlertDescription>
    </Alert>

    <Card>
      <CardHeader>
        <CardTitle>{{ t('backups.imports.upload.title') }}</CardTitle>
        <CardDescription>{{ t('backups.imports.upload.description') }}</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel for="save-import-file">{{ t('backups.imports.upload.file') }}</FieldLabel>
            <UiInput
              id="save-import-file"
              ref="fileInput"
              type="file"
              accept=".zip,.tar,.tar.gz,.tgz,application/zip,application/x-tar,application/gzip"
              :disabled="uploading || !isLocalTarget"
              @change="selectUploadFile"
            />
            <FieldDescription>{{ t('backups.imports.upload.fileDescription') }}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel for="save-import-name">{{ t('backups.imports.upload.name') }}</FieldLabel>
            <UiInput
              id="save-import-name"
              v-model="uploadName"
              maxlength="128"
              :placeholder="t('backups.imports.upload.namePlaceholder')"
              :disabled="uploading || !isLocalTarget"
            />
            <FieldDescription>{{ t('backups.imports.upload.nameDescription') }}</FieldDescription>
          </Field>
          <Field v-if="uploading">
            <div class="flex items-center justify-between gap-3 text-sm">
              <span>{{ t('backups.imports.upload.uploading') }}</span>
              <span class="text-muted-foreground">{{ uploadProgress }}%</span>
            </div>
            <UiProgress :model-value="uploadProgress" />
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter class="justify-end">
        <UiButton :disabled="!uploadFile || uploading || !isLocalTarget" @click="uploadArchive">
          <Spinner v-if="uploading" data-icon="inline-start" />
          <Upload v-else data-icon="inline-start" />
          {{ uploading ? t('backups.imports.upload.uploading') : t('backups.imports.upload.action') }}
        </UiButton>
      </CardFooter>
    </Card>

    <Alert v-if="loadError" variant="destructive">
      <TriangleAlert />
      <AlertTitle>{{ t('backups.imports.list.loadFailed') }}</AlertTitle>
      <AlertDescription>{{ loadError }}</AlertDescription>
      <AlertAction>
        <UiButton variant="outline" size="sm" @click="loadImports">
          <RefreshCw data-icon="inline-start" />
          {{ t('backups.actions.reload') }}
        </UiButton>
      </AlertAction>
    </Alert>

    <Card>
      <CardHeader>
        <CardTitle>{{ t('backups.imports.list.title') }}</CardTitle>
        <CardDescription>{{ t('backups.imports.list.description') }}</CardDescription>
        <CardAction>
          <UiButton variant="outline" size="sm" :disabled="loading || !isLocalTarget" @click="loadImports">
            <Spinner v-if="loading" data-icon="inline-start" />
            <RefreshCw v-else data-icon="inline-start" />
            {{ t('backups.actions.refresh') }}
          </UiButton>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div class="w-full overflow-x-auto">
          <ShadcnTable>
            <TableHeader>
              <TableRow>
                <TableHead>{{ t('backups.imports.list.columns.name') }}</TableHead>
                <TableHead>{{ t('backups.imports.list.columns.source') }}</TableHead>
                <TableHead>{{ t('backups.imports.list.columns.size') }}</TableHead>
                <TableHead>{{ t('backups.imports.list.columns.status') }}</TableHead>
                <TableHead>{{ t('backups.imports.list.columns.createdAt') }}</TableHead>
                <TableHead class="w-36 text-right">{{ t('backups.imports.list.columns.actions') }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="item in imports" :key="item.id">
                <TableCell class="font-medium">
                  <div class="flex min-w-40 items-center gap-2">
                    <FileArchive />
                    <span class="truncate">{{ item.name }}</span>
                  </div>
                </TableCell>
                <TableCell class="max-w-56 truncate">{{ item.sourceName }}</TableCell>
                <TableCell>{{ formatBytes(item.size) }}</TableCell>
                <TableCell>
                  <div class="flex min-w-28 flex-col gap-1.5">
                    <Badge :variant="saveImportStatusVariant(item.status)">{{ t(saveImportStatusKey(item.status)) }}</Badge>
                    <UiProgress v-if="jobFor(item.id)" :model-value="jobFor(item.id).progress || 0" />
                  </div>
                </TableCell>
                <TableCell>{{ formatDate(item.createdAt) }}</TableCell>
                <TableCell>
                  <div class="flex justify-end gap-1">
                    <UiButton
                      variant="ghost"
                      size="icon-sm"
                      :title="t('backups.imports.actions.details')"
                      :aria-label="t('backups.imports.actions.details')"
                      @click="openDetails(item)"
                    >
                      <Eye />
                    </UiButton>
                    <UiButton
                      variant="ghost"
                      size="icon-sm"
                      :disabled="isImportBusy(item) || !isLocalTarget"
                      :title="t('backups.imports.actions.analyze')"
                      :aria-label="t('backups.imports.actions.analyze')"
                      @click="reanalyze(item)"
                    >
                      <ScanSearch />
                    </UiButton>
                    <UiButton
                      variant="ghost"
                      size="icon-sm"
                      :disabled="isImportBusy(item) || !isLocalTarget"
                      :title="t('backups.imports.actions.delete')"
                      :aria-label="t('backups.imports.actions.delete')"
                      @click="openDelete(item)"
                    >
                      <Trash2 />
                    </UiButton>
                  </div>
                </TableCell>
              </TableRow>
              <TableEmpty v-if="loading" :colspan="6">
                <div class="flex min-w-160 flex-col gap-2 py-2" :aria-label="t('backups.imports.list.loading')">
                  <Skeleton v-for="row in 4" :key="row" class="h-10 w-full" />
                </div>
              </TableEmpty>
              <TableEmpty v-else-if="!loadError && imports.length === 0" :colspan="6">
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon"><ArchiveRestore /></EmptyMedia>
                    <EmptyTitle>{{ t('backups.imports.list.empty') }}</EmptyTitle>
                    <EmptyDescription>{{ t('backups.imports.list.emptyDescription') }}</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </TableEmpty>
            </TableBody>
          </ShadcnTable>
        </div>
      </CardContent>
    </Card>

    <UiDialog v-model:open="detailsOpen">
      <DialogScrollContent class="sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>{{ selectedImport?.name || t('backups.imports.details.title') }}</DialogTitle>
          <DialogDescription>{{ t('backups.imports.details.description') }}</DialogDescription>
        </DialogHeader>

        <div v-if="detailLoading" class="flex flex-col gap-3 py-2">
          <Skeleton class="h-20 w-full" />
          <Skeleton class="h-56 w-full" />
        </div>
        <div v-else-if="selectedImport" class="flex min-w-0 flex-col gap-5">
          <Alert v-if="detailError" variant="destructive">
            <TriangleAlert />
            <AlertTitle>{{ t('backups.imports.details.loadFailed') }}</AlertTitle>
            <AlertDescription>{{ detailError }}</AlertDescription>
          </Alert>
          <Alert v-if="roomsLoadError">
            <TriangleAlert />
            <AlertTitle>{{ t('backups.imports.apply.roomsLoadFailedTitle') }}</AlertTitle>
            <AlertDescription>{{ roomsLoadError }}</AlertDescription>
          </Alert>
          <Alert v-if="selectedImport.status === 'invalid'" variant="destructive">
            <TriangleAlert />
            <AlertTitle>{{ t('backups.imports.details.invalidTitle') }}</AlertTitle>
            <AlertDescription>{{ localizedImportError(selectedImport) }}</AlertDescription>
          </Alert>
          <Alert v-else-if="selectedImport.errorCode" variant="destructive">
            <TriangleAlert />
            <AlertTitle>{{ t('backups.imports.details.lastFailureTitle') }}</AlertTitle>
            <AlertDescription>{{ localizedImportError(selectedImport) }}</AlertDescription>
          </Alert>

          <section class="flex flex-col gap-3" :aria-labelledby="'import-summary-heading'">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h3 id="import-summary-heading" class="text-base font-medium">{{ t('backups.imports.details.summary') }}</h3>
              <Badge :variant="saveImportStatusVariant(selectedImport.status)">{{ t(saveImportStatusKey(selectedImport.status)) }}</Badge>
            </div>
            <dl class="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div><dt class="text-muted-foreground">{{ t('backups.imports.details.format') }}</dt><dd class="mt-1 font-medium">{{ selectedImport.manifest?.format || '--' }}</dd></div>
              <div><dt class="text-muted-foreground">{{ t('backups.imports.details.compressedSize') }}</dt><dd class="mt-1 font-medium">{{ formatBytes(selectedImport.manifest?.compressedSize || selectedImport.size) }}</dd></div>
              <div><dt class="text-muted-foreground">{{ t('backups.imports.details.contentSize') }}</dt><dd class="mt-1 font-medium">{{ formatBytes(selectedImport.manifest?.contentSize) }}</dd></div>
              <div><dt class="text-muted-foreground">{{ t('backups.imports.details.fileCount') }}</dt><dd class="mt-1 font-medium">{{ selectedImport.manifest?.fileCount ?? '--' }}</dd></div>
            </dl>
          </section>

          <template v-if="selectedImport.manifest?.candidates?.length">
            <Separator />
            <Field>
              <FieldLabel>{{ t('backups.imports.details.candidate') }}</FieldLabel>
              <UiSelect v-model="selectedCandidateId" @update:model-value="selectCandidate">
                <SelectTrigger><SelectValue :placeholder="t('backups.imports.details.selectCandidate')" /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem v-for="candidate in selectedImport.manifest.candidates" :key="candidate.id" :value="candidate.id">
                      {{ candidate.name }} · {{ t(saveImportCompatibilityKey(candidate.compatibility)) }}
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </UiSelect>
            </Field>

            <template v-if="selectedCandidate">
              <section class="flex flex-col gap-3" :aria-labelledby="'candidate-heading'">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 id="candidate-heading" class="text-base font-medium">{{ selectedCandidate.name }}</h3>
                  <Badge :variant="saveImportCompatibilityVariant(selectedCandidate.compatibility)">{{ t(saveImportCompatibilityKey(selectedCandidate.compatibility)) }}</Badge>
                  <Badge variant="outline">{{ selectedCandidate.gameMode }}</Badge>
                  <Badge variant="outline">{{ t('backups.imports.details.players', { count: selectedCandidate.maxPlayers }) }}</Badge>
                </div>
                <p v-if="selectedCandidate.description" class="text-sm text-muted-foreground">{{ selectedCandidate.description }}</p>
                <dl class="grid gap-3 text-sm sm:grid-cols-3">
                  <div><dt class="text-muted-foreground">{{ t('backups.imports.details.directory') }}</dt><dd class="mt-1 font-medium">{{ selectedCandidate.directoryName }}</dd></div>
                  <div><dt class="text-muted-foreground">{{ t('backups.imports.details.token') }}</dt><dd class="mt-1 font-medium">{{ selectedCandidate.tokenPresent ? t('backups.imports.details.present') : t('backups.imports.details.absent') }}</dd></div>
                  <div><dt class="text-muted-foreground">{{ t('backups.imports.details.ignoredFiles') }}</dt><dd class="mt-1 font-medium">{{ selectedCandidate.ignoredSystemFiles || 0 }}</dd></div>
                </dl>
              </section>

              <section class="flex flex-col gap-2" :aria-labelledby="'worlds-heading'">
                <h3 id="worlds-heading" class="text-base font-medium">{{ t('backups.imports.details.worlds') }}</h3>
                <div class="w-full overflow-x-auto rounded-md border">
                  <ShadcnTable>
                    <TableHeader><TableRow><TableHead>{{ t('backups.imports.details.worldColumns.world') }}</TableHead><TableHead>{{ t('backups.imports.details.worldColumns.role') }}</TableHead><TableHead>{{ t('backups.imports.details.worldColumns.shard') }}</TableHead><TableHead>{{ t('backups.imports.details.worldColumns.ports') }}</TableHead><TableHead>{{ t('backups.imports.details.worldColumns.sessions') }}</TableHead></TableRow></TableHeader>
                    <TableBody>
                      <TableRow v-for="world in selectedCandidate.worlds" :key="world.directoryName">
                        <TableCell class="font-medium">{{ world.name }}</TableCell>
                        <TableCell>{{ t(saveImportRoleKey(world.role)) }}</TableCell>
                        <TableCell>{{ world.shardId || '--' }}</TableCell>
                        <TableCell class="whitespace-nowrap">{{ portSummary(world) }}</TableCell>
                        <TableCell>{{ world.sessionCount }}</TableCell>
                      </TableRow>
                    </TableBody>
                  </ShadcnTable>
                </div>
              </section>

              <section class="flex flex-col gap-2" :aria-labelledby="'mods-heading'">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <h3 id="mods-heading" class="text-base font-medium">{{ t('backups.imports.details.mods') }}</h3>
                  <Badge v-if="missingMods.length" variant="secondary">{{ t('backups.imports.details.missingMods', { count: missingMods.length }) }}</Badge>
                </div>
                <div v-if="selectedCandidate.mods?.length" class="w-full overflow-x-auto rounded-md border">
                  <ShadcnTable>
                    <TableHeader><TableRow><TableHead>{{ t('backups.imports.details.modColumns.id') }}</TableHead><TableHead>{{ t('backups.imports.details.modColumns.worlds') }}</TableHead><TableHead>{{ t('backups.imports.details.modColumns.status') }}</TableHead></TableRow></TableHeader>
                    <TableBody><TableRow v-for="mod in selectedCandidate.mods" :key="mod.id"><TableCell class="font-medium">{{ mod.id }}</TableCell><TableCell>{{ mod.worlds.join(', ') }}</TableCell><TableCell><Badge :variant="mod.downloaded ? 'outline' : 'secondary'">{{ mod.downloaded ? t('backups.imports.details.downloaded') : t('backups.imports.details.notDownloaded') }}</Badge></TableCell></TableRow></TableBody>
                  </ShadcnTable>
                </div>
                <p v-else class="text-sm text-muted-foreground">{{ t('backups.imports.details.noMods') }}</p>
              </section>

              <section v-if="allDiagnostics.length" class="flex flex-col gap-2" :aria-labelledby="'diagnostics-heading'">
                <h3 id="diagnostics-heading" class="text-base font-medium">{{ t('backups.imports.details.diagnostics') }}</h3>
                <Alert v-for="(diagnostic, index) in allDiagnostics" :key="`${diagnostic.code}-${index}`" :variant="saveImportDiagnosticVariant(diagnostic.severity)">
                  <TriangleAlert v-if="diagnostic.severity !== 'info'" />
                  <Info v-else />
                  <AlertTitle>{{ t(`backups.imports.severities.${diagnostic.severity || 'info'}`) }}</AlertTitle>
                  <AlertDescription>
                    {{ localizedDiagnostic(diagnostic) }}
                    <span v-if="diagnostic.path"> · {{ diagnostic.path }}</span>
                  </AlertDescription>
                </Alert>
              </section>

              <Separator />
              <section class="flex flex-col gap-4" :aria-labelledby="'deployment-heading'">
                <div>
                  <h3 id="deployment-heading" class="text-base font-medium">{{ t('backups.imports.apply.title') }}</h3>
                  <p class="mt-1 text-sm text-muted-foreground">{{ t('backups.imports.apply.description') }}</p>
                </div>

                <FieldSet>
                  <FieldLegend>{{ t('backups.imports.apply.mode.label') }}</FieldLegend>
                  <RadioGroup v-model="applyPlan.mode" class="sm:grid-cols-3" @update:model-value="changeApplyMode">
                    <FieldLabel v-for="mode in applyModes" :key="mode.value">
                      <Field orientation="horizontal">
                        <FieldContent>
                          <FieldTitle>{{ t(mode.titleKey) }}</FieldTitle>
                          <FieldDescription>{{ t(mode.descriptionKey) }}</FieldDescription>
                        </FieldContent>
                        <RadioGroupItem :value="mode.value" />
                      </Field>
                    </FieldLabel>
                  </RadioGroup>
                </FieldSet>

                <FieldGroup>
                  <template v-if="applyPlan.mode === 'replace'">
                    <Field>
                      <FieldLabel>{{ t('backups.imports.apply.targetRoom') }}</FieldLabel>
                      <UiSelect v-model="applyPlan.targetRoomId">
                        <SelectTrigger><SelectValue :placeholder="t('backups.imports.apply.selectTargetRoom')" /></SelectTrigger>
                        <SelectContent><SelectGroup><SelectItem v-for="room in rooms" :key="room.id" :value="room.id" :disabled="room.running !== false">{{ room.name }}<template v-if="room.running === true"> · {{ t('backups.imports.apply.roomRunning') }}</template><template v-else-if="room.running === null"> · {{ t('backups.imports.apply.roomStatusUnknown') }}</template></SelectItem></SelectGroup></SelectContent>
                      </UiSelect>
                      <FieldDescription>{{ t('backups.imports.apply.replaceDescription') }}</FieldDescription>
                    </Field>
                    <Field>
                      <FieldLabel for="replace-confirmation">{{ t('backups.imports.apply.confirmation') }}</FieldLabel>
                      <UiInput id="replace-confirmation" v-model="applyPlan.confirmation" :placeholder="selectedTargetRoom?.name || t('backups.imports.apply.confirmationPlaceholder')" />
                      <FieldDescription>{{ t('backups.imports.apply.confirmationDescription', { name: selectedTargetRoom?.name || '--' }) }}</FieldDescription>
                    </Field>
                  </template>
                  <template v-else>
                    <Field>
                      <FieldLabel for="import-directory">{{ t('backups.imports.apply.directoryName') }}</FieldLabel>
                      <UiInput id="import-directory" v-model="applyPlan.directoryName" maxlength="64" />
                      <FieldDescription>{{ t('backups.imports.apply.directoryDescription') }}</FieldDescription>
                    </Field>
                    <Field>
                      <FieldLabel for="import-room-name">{{ t('backups.imports.apply.roomName') }}</FieldLabel>
                      <UiInput id="import-room-name" v-model="applyPlan.roomName" maxlength="128" />
                    </Field>
                  </template>

                  <Field>
                    <FieldLabel>{{ t('backups.imports.apply.tokenPolicy.label') }}</FieldLabel>
                    <UiSelect v-model="applyPlan.tokenPolicy" @update:model-value="normalizePlan">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectGroup>
                        <SelectItem value="source" :disabled="!selectedCandidate.tokenPresent">{{ t('backups.imports.apply.tokenPolicy.source') }}</SelectItem>
                        <SelectItem v-if="applyPlan.mode === 'replace'" value="preserve">{{ t('backups.imports.apply.tokenPolicy.preserve') }}</SelectItem>
                        <SelectItem value="provided">{{ t('backups.imports.apply.tokenPolicy.provided') }}</SelectItem>
                        <SelectItem value="none">{{ t('backups.imports.apply.tokenPolicy.none') }}</SelectItem>
                      </SelectGroup></SelectContent>
                    </UiSelect>
                    <FieldDescription>{{ t(`backups.imports.apply.tokenPolicy.descriptions.${applyPlan.tokenPolicy}`) }}</FieldDescription>
                  </Field>
                  <Field v-if="applyPlan.tokenPolicy === 'provided'">
                    <FieldLabel for="import-cluster-token">{{ t('backups.imports.apply.clusterToken') }}</FieldLabel>
                    <UiInput id="import-cluster-token" v-model="applyPlan.clusterToken" type="password" autocomplete="off" :placeholder="t('backups.imports.apply.clusterTokenPlaceholder')" />
                  </Field>

                  <Field>
                    <FieldLabel>{{ t('backups.imports.apply.networkPolicy.label') }}</FieldLabel>
                    <UiSelect v-model="applyPlan.networkPolicy">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectGroup>
                        <SelectItem value="auto">{{ t('backups.imports.apply.networkPolicy.auto') }}</SelectItem>
                        <SelectItem value="source">{{ t('backups.imports.apply.networkPolicy.source') }}</SelectItem>
                        <SelectItem v-if="applyPlan.mode === 'replace'" value="preserve">{{ t('backups.imports.apply.networkPolicy.preserve') }}</SelectItem>
                      </SelectGroup></SelectContent>
                    </UiSelect>
                    <FieldDescription>{{ t(`backups.imports.apply.networkPolicy.descriptions.${applyPlan.networkPolicy}`) }}</FieldDescription>
                  </Field>

                  <Field>
                    <FieldLabel>{{ t('backups.imports.apply.modPolicy.label') }}</FieldLabel>
                    <UiSelect v-model="applyPlan.modPolicy">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectGroup>
                        <SelectItem value="install_missing">{{ t('backups.imports.apply.modPolicy.install_missing') }}</SelectItem>
                        <SelectItem value="require_downloaded">{{ t('backups.imports.apply.modPolicy.require_downloaded') }}</SelectItem>
                        <SelectItem value="preserve">{{ t('backups.imports.apply.modPolicy.preserve') }}</SelectItem>
                      </SelectGroup></SelectContent>
                    </UiSelect>
                    <FieldDescription>{{ t(`backups.imports.apply.modPolicy.descriptions.${applyPlan.modPolicy}`) }}</FieldDescription>
                  </Field>

                  <Field v-if="hasCandidateDiagnostic(selectedCandidate, 'MASTER_MISSING')" orientation="horizontal">
                    <UiCheckbox id="allow-partial-import" v-model="applyPlan.allowPartial" />
                    <FieldContent>
                      <FieldLabel for="allow-partial-import">{{ t('backups.imports.apply.allowPartial') }}</FieldLabel>
                      <FieldDescription>{{ t('backups.imports.apply.allowPartialDescription') }}</FieldDescription>
                    </FieldContent>
                  </Field>
                  <Field v-if="['none', 'preserve'].includes(applyPlan.tokenPolicy)" orientation="horizontal">
                    <UiCheckbox id="allow-missing-token" v-model="applyPlan.allowMissingToken" />
                    <FieldContent>
                      <FieldLabel for="allow-missing-token">{{ t('backups.imports.apply.allowMissingToken') }}</FieldLabel>
                      <FieldDescription>{{ t('backups.imports.apply.allowMissingTokenDescription') }}</FieldDescription>
                    </FieldContent>
                  </Field>
                </FieldGroup>

                <Alert v-if="applyPlan.mode === 'replace'" variant="destructive">
                  <TriangleAlert />
                  <AlertTitle>{{ t('backups.imports.apply.replaceWarningTitle') }}</AlertTitle>
                  <AlertDescription>{{ t('backups.imports.apply.replaceWarningDescription') }}</AlertDescription>
                </Alert>

                <div v-if="selectedJob" class="flex flex-col gap-2">
                  <div class="flex items-center justify-between gap-3 text-sm">
                    <span>{{ t(`backups.imports.jobs.${selectedJob.kind === 'save-import.apply' ? 'applying' : 'analyzing'}`) }}</span>
                    <span class="text-muted-foreground">{{ selectedJob.progress || 0 }}%</span>
                  </div>
                  <UiProgress :model-value="selectedJob.progress || 0" />
                </div>
              </section>
            </template>
          </template>
          <Empty v-else-if="selectedImport.status !== 'invalid'">
            <EmptyHeader><EmptyTitle>{{ t('backups.imports.details.notReady') }}</EmptyTitle><EmptyDescription>{{ t('backups.imports.details.notReadyDescription') }}</EmptyDescription></EmptyHeader>
          </Empty>
        </div>

        <DialogFooter>
          <UiButton variant="outline" @click="detailsOpen = false">{{ t('common.actions.close') }}</UiButton>
          <UiButton
            v-if="selectedCandidate"
            :disabled="!canApply || applying"
            @click="applyImport"
          >
            <Spinner v-if="applying" data-icon="inline-start" />
            <ArchiveRestore v-else data-icon="inline-start" />
            {{ t('backups.imports.apply.action') }}
          </UiButton>
        </DialogFooter>
      </DialogScrollContent>
    </UiDialog>

    <UiDialog v-model:open="deleteOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('backups.imports.delete.title') }}</DialogTitle>
          <DialogDescription>{{ t('backups.imports.delete.description') }}</DialogDescription>
        </DialogHeader>
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>{{ t('backups.imports.delete.warningTitle') }}</AlertTitle>
          <AlertDescription>{{ t('backups.imports.delete.warningDescription') }}</AlertDescription>
        </Alert>
        <Field>
          <FieldLabel for="delete-import-confirmation">{{ t('backups.imports.delete.confirmation') }}</FieldLabel>
          <UiInput id="delete-import-confirmation" v-model="deleteConfirmation" :placeholder="deleteTarget?.name || ''" />
          <FieldDescription>{{ t('backups.imports.delete.confirmationDescription', { name: deleteTarget?.name || '--' }) }}</FieldDescription>
        </Field>
        <DialogFooter>
          <UiButton variant="outline" @click="deleteOpen = false">{{ t('common.actions.cancel') }}</UiButton>
          <UiButton variant="destructive" :disabled="deleting || deleteConfirmation !== deleteTarget?.name" @click="deleteImport">
            <Spinner v-if="deleting" data-icon="inline-start" />
            <Trash2 v-else data-icon="inline-start" />
            {{ t('backups.imports.actions.delete') }}
          </UiButton>
        </DialogFooter>
      </DialogContent>
    </UiDialog>
  </div>
</template>

<script setup>
import {
  ArchiveRestore,
  Eye,
  FileArchive,
  Info,
  RefreshCw,
  ScanSearch,
  ServerOff,
  Trash2,
  TriangleAlert,
  Upload
} from '@lucide/vue'
import { formatSystemDateTime } from '@/lib/dateTime.mjs'
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

import { jobsV2API, roomsV2API, saveImportsV2API } from '@/api/v2'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox as UiCheckbox } from '@/components/ui/checkbox'
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogScrollContent, DialogTitle } from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet, FieldTitle } from '@/components/ui/field'
import { Input as UiInput } from '@/components/ui/input'
import { Progress as UiProgress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Table as ShadcnTable, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  SAVE_IMPORT_TERMINAL_JOB_STATES,
  defaultSaveImportPlan,
  hasCandidateDiagnostic,
  isSupportedSaveImportFile,
  missingWorkshopMods,
  normalizeSaveImportPlan,
  saveImportCompatibilityKey,
  saveImportCompatibilityVariant,
  saveImportDiagnosticKey,
  saveImportDiagnosticVariant,
  saveImportJobFailure,
  saveImportRoleKey,
  saveImportStatusKey,
  saveImportStatusVariant,
  validateSaveImportPlan
} from '@/lib/saveImportSupport.mjs'
import { getActiveRuntimeTarget, RUNTIME_TARGET_CHANGED_EVENT } from '@/utils/runtimeTarget'

const emit = defineEmits(['rooms-changed'])
const { locale, te, t } = useI18n()

const applyModes = Object.freeze([
  { value: 'new', titleKey: 'backups.imports.apply.mode.new', descriptionKey: 'backups.imports.apply.mode.newDescription' },
  { value: 'replace', titleKey: 'backups.imports.apply.mode.replace', descriptionKey: 'backups.imports.apply.mode.replaceDescription' },
  { value: 'clone', titleKey: 'backups.imports.apply.mode.clone', descriptionKey: 'backups.imports.apply.mode.cloneDescription' }
])

const imports = ref([])
const rooms = ref([])
const loading = ref(false)
const loadError = ref('')
const roomsLoadError = ref('')
const uploadFile = ref(null)
const uploadName = ref('')
const uploading = ref(false)
const uploadProgress = ref(0)
const fileInput = ref(null)
const jobsByImport = ref({})
const detailsOpen = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const selectedImport = ref(null)
const selectedCandidateId = ref('')
const applying = ref(false)
const deleteOpen = ref(false)
const deleteTarget = ref(null)
const deleteConfirmation = ref('')
const deleting = ref(false)
const runtimeTarget = ref(getActiveRuntimeTarget())
const applyPlan = reactive(defaultSaveImportPlan(null))
let disposed = false
let refreshTimer = null
let importRequestSequence = 0
let importLoadingSequence = 0
let roomRequestSequence = 0
let detailRequestSequence = 0
let runtimeGeneration = 0

const isLocalTarget = computed(() => runtimeTarget.value?.kind === 'local')
const selectedCandidate = computed(() => (
  selectedImport.value?.manifest?.candidates?.find(candidate => candidate.id === selectedCandidateId.value) || null
))
const missingMods = computed(() => missingWorkshopMods(selectedCandidate.value))
const allDiagnostics = computed(() => [
  ...(selectedImport.value?.manifest?.diagnostics || []),
  ...(selectedCandidate.value?.diagnostics || [])
])
const selectedTargetRoom = computed(() => rooms.value.find(room => room.id === applyPlan.targetRoomId) || null)
const selectedJob = computed(() => selectedImport.value ? jobsByImport.value[selectedImport.value.id] || null : null)
const canApply = computed(() => (
  isLocalTarget.value &&
  ['ready', 'applied'].includes(selectedImport.value?.status) &&
  selectedCandidate.value?.compatibility !== 'blocked' &&
  (applyPlan.mode !== 'replace' || selectedTargetRoom.value?.running === false) &&
  !selectedJob.value
))

function sleep(milliseconds) {
  return new Promise(resolve => window.setTimeout(resolve, milliseconds))
}

function formatBytes(value) {
  const bytes = Number(value)
  if (!Number.isFinite(bytes) || bytes < 0) return '--'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let amount = bytes
  let unit = -1
  do {
    amount /= 1024
    unit += 1
  } while (amount >= 1024 && unit < units.length - 1)
  return `${amount >= 10 ? amount.toFixed(1) : amount.toFixed(2)} ${units[unit]}`
}

function formatDate(value) {
  return formatSystemDateTime(value, {
    locale: locale.value,
    fallback: value ? String(value) : '--',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

function jobFor(importId) {
  return jobsByImport.value[importId] || null
}

function isImportBusy(item) {
  return Boolean(jobFor(item.id)) || ['analyzing', 'applying'].includes(item.status)
}

function portSummary(world) {
  const ports = world?.ports || {}
  return [ports.server, ports.authentication, ports.masterServer].filter(value => Number(value) > 0).join(' / ') || '--'
}

function localizedDiagnostic(diagnostic) {
  const key = saveImportDiagnosticKey(diagnostic?.code)
  return key && te(key) ? t(key, diagnostic?.details || {}) : (diagnostic?.message || diagnostic?.code || '--')
}

function localizedImportError(item) {
  return localizedError(item?.errorCode, item?.errorMessage)
}

function localizedError(code, fallback = '') {
  const key = `backups.imports.errors.${code || 'unknown'}`
  return te(key) ? t(key) : (fallback || t('backups.imports.errors.unknown'))
}

function ensureCandidateSelection(item) {
  const candidates = item?.manifest?.candidates || []
  if (!candidates.length) {
    selectedCandidateId.value = ''
    return
  }
  const selected = candidates.find(candidate => candidate.id === selectedCandidateId.value) || candidates[0]
  if (selected.id !== selectedCandidateId.value) {
    selectedCandidateId.value = selected.id
    Object.assign(applyPlan, defaultSaveImportPlan(selected))
  }
}

async function loadImports({ quiet = false } = {}) {
  if (!isLocalTarget.value) return
  const sequence = ++importRequestSequence
  if (!quiet) {
    importLoadingSequence = sequence
    loading.value = true
  }
  loadError.value = ''
  try {
    const response = await saveImportsV2API.list()
    if (sequence !== importRequestSequence) return false
    imports.value = response.items || []
    if (selectedImport.value) {
      const updated = imports.value.find(item => item.id === selectedImport.value.id)
      if (updated) {
        selectedImport.value = updated
        ensureCandidateSelection(updated)
      }
    }
    return true
  } catch (error) {
    if (sequence !== importRequestSequence) return false
    loadError.value = error.message || t('backups.imports.list.loadFailed')
    return false
  } finally {
    if (!quiet && importLoadingSequence === sequence) loading.value = false
  }
}

async function loadRooms() {
  if (!isLocalTarget.value) return
  const sequence = ++roomRequestSequence
  roomsLoadError.value = ''
  try {
    const response = await roomsV2API.list()
    const managed = (response.items || []).filter(room => room.managed)
    const nextRooms = await Promise.all(managed.map(async room => {
      try {
        const worlds = await roomsV2API.worlds(room.id)
        return { ...room, running: (worlds.items || []).some(world => world.status === 'running') }
      } catch {
        return { ...room, running: null }
      }
    }))
    if (sequence !== roomRequestSequence) return false
    rooms.value = nextRooms
    return true
  } catch (error) {
    if (sequence !== roomRequestSequence) return false
    roomsLoadError.value = error.message || t('backups.imports.apply.roomsLoadFailed')
    return false
  }
}

function selectUploadFile(event) {
  const file = event.target?.files?.[0] || null
  if (file && !isSupportedSaveImportFile(file.name)) {
    uploadFile.value = null
    event.target.value = ''
    toast.error(t('backups.imports.feedback.unsupportedFormat'))
    return
  }
  uploadFile.value = file
}

async function uploadArchive() {
  if (!uploadFile.value || !isLocalTarget.value) return
  const generation = runtimeGeneration
  uploading.value = true
  uploadProgress.value = 0
  try {
    const result = await saveImportsV2API.upload(uploadFile.value, uploadName.value.trim(), event => {
      if (generation === runtimeGeneration && event.total) {
        uploadProgress.value = Math.min(99, Math.round(event.loaded * 100 / event.total))
      }
    })
    if (generation !== runtimeGeneration) return
    uploadProgress.value = 100
    imports.value = [result.import, ...imports.value.filter(item => item.id !== result.import.id)]
    uploadFile.value = null
    uploadName.value = ''
    if (fileInput.value?.$el) fileInput.value.$el.value = ''
    toast.success(t('backups.imports.feedback.uploaded'))
    if (result.job) void trackJob(result.job, result.import.id, 'analyze')
  } catch (error) {
    if (generation !== runtimeGeneration) return
    toast.error(t('backups.imports.feedback.uploadFailed', { error: error.message || t('common.errors.unknown') }))
  } finally {
    if (generation === runtimeGeneration) uploading.value = false
  }
}

async function refreshImport(importId, generation = runtimeGeneration) {
  try {
    const item = await saveImportsV2API.get(importId)
    if (disposed || generation !== runtimeGeneration) return null
    imports.value = imports.value.map(current => current.id === item.id ? item : current)
    if (selectedImport.value?.id === item.id) {
      selectedImport.value = item
      ensureCandidateSelection(item)
    }
    return item
  } catch {
    if (disposed || generation !== runtimeGeneration) return null
    const loaded = await loadImports({ quiet: true })
    if (disposed || generation !== runtimeGeneration) return null
    return loaded ? (imports.value.find(item => item.id === importId) || null) : null
  }
}

async function trackJob(initialJob, importId, purpose) {
  if (!initialJob?.id || jobsByImport.value[importId]?.id === initialJob.id) return
  const generation = runtimeGeneration
  let job = initialJob
  let pollingFailure = null
  jobsByImport.value = { ...jobsByImport.value, [importId]: job }
  for (let attempt = 0; attempt < 1800 && !disposed && generation === runtimeGeneration; attempt += 1) {
    if (SAVE_IMPORT_TERMINAL_JOB_STATES.has(job.status)) break
    await sleep(1000)
    if (disposed || generation !== runtimeGeneration) return
    try {
      job = await jobsV2API.get(job.id)
      jobsByImport.value = { ...jobsByImport.value, [importId]: job }
    } catch (error) {
      pollingFailure = error
      break
    }
  }
  if (disposed || generation !== runtimeGeneration) return
  const nextJobs = { ...jobsByImport.value }
  delete nextJobs[importId]
  jobsByImport.value = nextJobs
  const pollingTimedOut = !pollingFailure && !SAVE_IMPORT_TERMINAL_JOB_STATES.has(job.status)
  const refreshedImport = await refreshImport(importId, generation)
  if (disposed || generation !== runtimeGeneration) return
  if (pollingFailure) {
    toast.error(t('backups.imports.feedback.jobStatusFailed', { error: localizedError(pollingFailure.code, pollingFailure.message) }))
    return
  }
  if (pollingTimedOut) {
    toast.warning(t('backups.imports.feedback.jobStatusTimedOut'))
    return
  }
  if (job.status === 'succeeded') {
    if (refreshedImport) toast.success(t(`backups.imports.feedback.${purpose === 'apply' ? 'applied' : 'analyzed'}`))
    else toast.warning(t('backups.imports.feedback.completedRefreshFailed'))
    if (purpose === 'apply') {
      const roomsLoaded = await loadRooms()
      if (disposed || generation !== runtimeGeneration) return
      if (!roomsLoaded) toast.warning(t('backups.imports.feedback.roomsRefreshFailed'))
      emit('rooms-changed')
    }
    return
  }
  const failure = saveImportJobFailure(job)
  toast.error(t('backups.imports.feedback.jobFailed', { error: localizedError(failure?.code, failure?.message) }))
}

async function reanalyze(item) {
  const generation = runtimeGeneration
  try {
    const job = await saveImportsV2API.analyze(item.id)
    if (disposed || generation !== runtimeGeneration) return
    imports.value = imports.value.map(current => current.id === item.id ? { ...current, status: 'analyzing' } : current)
    toast.success(t('backups.imports.feedback.analysisStarted'))
    void trackJob(job, item.id, 'analyze')
  } catch (error) {
    if (disposed || generation !== runtimeGeneration) return
    toast.error(t('backups.imports.feedback.analysisFailed', { error: error.message || t('common.errors.unknown') }))
  }
}

async function openDetails(item) {
  const sequence = ++detailRequestSequence
  detailsOpen.value = true
  detailLoading.value = true
  detailError.value = ''
  selectedImport.value = item
  try {
    const value = await saveImportsV2API.get(item.id)
    if (sequence !== detailRequestSequence) return
    selectedImport.value = value
    selectedCandidateId.value = ''
    ensureCandidateSelection(selectedImport.value)
    await loadRooms()
  } catch (error) {
    if (sequence !== detailRequestSequence) return
    detailError.value = error.message || t('common.errors.unknown')
    toast.error(t('backups.imports.feedback.detailsFailed', { error: error.message || t('common.errors.unknown') }))
  } finally {
    if (sequence === detailRequestSequence) detailLoading.value = false
  }
}

function selectCandidate(candidateId) {
  const candidate = selectedImport.value?.manifest?.candidates?.find(item => item.id === candidateId) || null
  Object.assign(applyPlan, defaultSaveImportPlan(candidate, applyPlan.mode))
}

function changeApplyMode(mode) {
  const defaults = defaultSaveImportPlan(selectedCandidate.value, mode)
  Object.assign(applyPlan, defaults)
}

function normalizePlan() {
  Object.assign(applyPlan, normalizeSaveImportPlan(applyPlan, selectedCandidate.value))
}

async function applyImport() {
  const validation = validateSaveImportPlan(applyPlan, selectedCandidate.value, selectedTargetRoom.value)
  if (validation) {
    toast.warning(t(`backups.imports.apply.validation.${validation}`))
    return
  }
  const generation = runtimeGeneration
  const importId = selectedImport.value.id
  applying.value = true
  try {
    const payload = {
      ...applyPlan,
      directoryName: applyPlan.directoryName.trim(),
      roomName: applyPlan.roomName.trim(),
      clusterToken: applyPlan.clusterToken.trim()
    }
    const job = await saveImportsV2API.apply(importId, payload)
    if (disposed || generation !== runtimeGeneration) return
    imports.value = imports.value.map(item => item.id === importId ? { ...item, status: 'applying' } : item)
    if (selectedImport.value?.id === importId) {
      selectedImport.value = { ...selectedImport.value, status: 'applying' }
    }
    toast.success(t('backups.imports.feedback.applyStarted'))
    void trackJob(job, importId, 'apply')
  } catch (error) {
    if (disposed || generation !== runtimeGeneration) return
    toast.error(t('backups.imports.feedback.applyFailed', { error: error.message || t('common.errors.unknown') }))
  } finally {
    if (generation === runtimeGeneration) applying.value = false
  }
}

function openDelete(item) {
  deleteTarget.value = item
  deleteConfirmation.value = ''
  deleteOpen.value = true
}

async function deleteImport() {
  if (!deleteTarget.value || deleteConfirmation.value !== deleteTarget.value.name) return
  const generation = runtimeGeneration
  const targetId = deleteTarget.value.id
  deleting.value = true
  try {
    await saveImportsV2API.delete(targetId, deleteConfirmation.value)
    if (disposed || generation !== runtimeGeneration) return
    imports.value = imports.value.filter(item => item.id !== targetId)
    if (selectedImport.value?.id === targetId) detailsOpen.value = false
    if (deleteTarget.value?.id === targetId) deleteOpen.value = false
    toast.success(t('backups.imports.feedback.deleted'))
  } catch (error) {
    if (disposed || generation !== runtimeGeneration) return
    toast.error(t('backups.imports.feedback.deleteFailed', { error: error.message || t('common.errors.unknown') }))
  } finally {
    if (generation === runtimeGeneration) deleting.value = false
  }
}

function handleRuntimeTargetChanged(event) {
  runtimeGeneration += 1
  importRequestSequence += 1
  roomRequestSequence += 1
  detailRequestSequence += 1
  runtimeTarget.value = event.detail || getActiveRuntimeTarget()
  imports.value = []
  rooms.value = []
  jobsByImport.value = {}
  loading.value = false
  uploading.value = false
  uploadProgress.value = 0
  detailLoading.value = false
  applying.value = false
  deleting.value = false
  loadError.value = ''
  roomsLoadError.value = ''
  detailError.value = ''
  detailsOpen.value = false
  deleteOpen.value = false
  deleteTarget.value = null
  deleteConfirmation.value = ''
  selectedImport.value = null
  selectedCandidateId.value = ''
  Object.assign(applyPlan, defaultSaveImportPlan(null))
  if (isLocalTarget.value) {
    void loadImports()
    void loadRooms()
  }
}

onMounted(() => {
  window.addEventListener(RUNTIME_TARGET_CHANGED_EVENT, handleRuntimeTargetChanged)
  if (isLocalTarget.value) {
    void loadImports()
    void loadRooms()
  }
  refreshTimer = window.setInterval(() => {
    if (isLocalTarget.value && imports.value.some(item => ['uploaded', 'analyzing', 'applying'].includes(item.status))) {
      void loadImports({ quiet: true })
    }
  }, 3000)
})

onBeforeUnmount(() => {
  disposed = true
  runtimeGeneration += 1
  importRequestSequence += 1
  roomRequestSequence += 1
  detailRequestSequence += 1
  window.removeEventListener(RUNTIME_TARGET_CHANGED_EVENT, handleRuntimeTargetChanged)
  if (refreshTimer) window.clearInterval(refreshTimer)
})
</script>

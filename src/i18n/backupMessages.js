export const backupMessages = {
  'zh-CN': {
    backups: {
      title: '备份管理',
      subtitle: '创建、恢复和导入完整房间存档；本机与远程世界使用同一套流程。',
      tabs: {
        roomBackups: '房间备份',
        saveImports: '存档导入'
      },
      catalog: {
        title: '房间备份',
        description: '按房间查看全部备份。新备份会自动包含房间内的所有世界，无需区分运行位置。',
        consistencyTitle: '每次备份都包含完整房间',
        consistencyDescription: '新建备份默认不停服，系统会协调房间内的所有世界完成同一次保存并逐一校验；历史版本创建的单文件备份也会保留在同一列表中。',
        partialLoadTitle: '部分备份记录暂时无法加载',
        columns: { worlds: '备份内容' },
        types: { history: '历史备份' },
        historyRecord: '旧版本创建的单文件备份',
        completeRoom: '完整房间',
        worldCount: '已校验 {verified}/{total} 个世界'
      },
      imports: {
        upload: {
          title: '上传本地存档',
          description: '上传后会先深度检查目录、分片、端口、Token 和 Workshop 模组，不会直接覆盖现有房间。',
          file: '存档压缩包',
          fileDescription: '支持 ZIP、TAR、TAR.GZ 和 TGZ，单个文件最大 16 GiB。',
          name: '导入名称',
          namePlaceholder: '留空时使用文件名',
          nameDescription: '只用于识别本次导入记录，不会修改游戏内房间名称。',
          action: '上传并分析',
          uploading: '正在上传'
        },
        list: {
          title: '导入记录',
          description: '检查已上传存档的兼容性，并选择一个候选房间部署。',
          loadFailed: '导入记录加载失败',
          loading: '正在加载导入记录',
          empty: '暂无导入记录',
          emptyDescription: '上传一个 DST 存档压缩包后，兼容报告会显示在这里。',
          columns: {
            name: '导入名称',
            source: '源文件',
            size: '大小',
            status: '状态',
            createdAt: '上传时间',
            actions: '操作'
          }
        },
        actions: {
          details: '查看兼容报告',
          analyze: '重新分析',
          delete: '删除导入记录'
        },
        statuses: {
          uploaded: '已上传',
          analyzing: '分析中',
          ready: '可部署',
          invalid: '无效存档',
          applying: '部署中',
          applied: '已部署',
          unknown: '未知状态'
        },
        compatibility: {
          ready: '兼容',
          needs_attention: '需要确认',
          blocked: '无法部署',
          unknown: '未知兼容性'
        },
        severities: {
          info: '说明',
          warning: '需要确认',
          error: '阻止部署'
        },
        roles: {
          master: '主世界',
          caves: '洞穴',
          custom: '自定义分片'
        },
        diagnostics: {
          MULTIPLE_CLUSTERS: '压缩包中检测到多个 DST 房间，可分别选择导入。',
          WRAPPED_CLUSTER_ROOT: '存档位于压缩包子目录中，导入时会自动剥离外层目录。',
          INVALID_CLUSTER_INI: 'cluster.ini 无法解析。',
          CLUSTER_TOKEN_MISSING: '存档未包含 cluster_token.txt，部署前必须选择 Token 策略。',
          DUPLICATE_PORT: '多个分片使用了端口 {port}，选择自动端口策略可以修复。',
          NO_WORLDS: '未找到包含 server.ini 的分片。',
          MASTER_MISSING: '没有检测到主世界，仅可在明确确认后按高级分片导入。',
          MULTIPLE_MASTERS: '检测到多个主世界，无法直接部署。',
          WORKSHOP_MODS_MISSING: '有 {count} 个 Workshop 模组尚未下载，原配置会保留。',
          INVALID_SERVER_INI: 'server.ini 无法解析。',
          WORLD_SESSION_MISSING: '此分片没有现有 Session，将按新世界配置启动。',
          WORKSHOP_MODS_NOT_INSTALLED: '模组配置已保留，但缺失的 Workshop 模组尚未下载。'
        },
        errors: {
          UNSAFE_ARCHIVE: '压缩包包含不安全路径、链接或冲突文件。',
          ARCHIVE_TOO_LARGE: '压缩包超过上传或解压安全上限。',
          INVALID_ARCHIVE: '未识别到可导入的 DST 存档，或压缩包内容无效。',
          IMPORT_ANALYSIS_FAILED: '存档分析失败。',
          SAVE_IMPORT_APPLY_FAILED: '存档部署失败。',
          INSUFFICIENT_SPACE: '本机剩余空间不足，无法安全部署存档。',
          SAVE_IMPORT_BUSY: '该存档已有分析或部署任务正在执行。',
          PORT_CONFLICT: '存档端口与本机其他房间冲突，请使用自动端口策略。',
          SAVE_IMPORT_NOT_FOUND: '存档导入记录不存在。',
          SAVE_IMPORT_NOT_READY: '存档尚未完成分析，暂时不能部署。',
          SAVE_IMPORT_CANDIDATE_NOT_FOUND: '选定的候选房间不存在，请重新分析。',
          WORLD_RUNNING: '目标房间仍有分片在运行，请全部停止后重试。',
          CLUSTER_TOKEN_REQUIRED: '当前 Token 策略没有提供可用的服务器 Token。',
          WORKSHOP_MODS_MISSING: '仍有必需的 Workshop 模组未下载。',
          WORKSHOP_DOWNLOAD_MISSING: 'SteamCMD 已结束，但未找到下载后的模组文件。',
          ROOM_EXISTS: '目标房间目录已经存在。',
          CONFIRMATION_REQUIRED: '操作确认内容不匹配。',
          ROOM_NOT_MANAGED: '目标房间尚未纳入本系统管理。',
          PARTIAL_IMPORT_CONFIRMATION_REQUIRED: '缺少主世界的分片导入需要明确确认。',
          WORLD_TOPOLOGY_MISMATCH: '存档中的世界数量或身份与目标房间不一致。请选择结构一致的房间，或先调整房间世界。',
          unknown: '操作未完成，请查看任务错误详情。'
        },
        details: {
          title: '存档兼容报告',
          description: '核对压缩包内容，并为选定候选房间配置部署方案。',
          loadFailed: '兼容报告刷新失败',
          invalidTitle: '此压缩包当前无法导入',
          lastFailureTitle: '上一次操作未完成',
          summary: '压缩包摘要',
          format: '格式',
          compressedSize: '压缩大小',
          contentSize: '解压大小',
          fileCount: '文件数',
          candidate: '候选房间',
          selectCandidate: '选择一个候选房间',
          players: '最多 {count} 人',
          directory: '源目录',
          token: '服务器 Token',
          present: '已包含',
          absent: '未包含',
          ignoredFiles: '已忽略系统文件',
          worlds: '分片与端口',
          mods: 'Workshop 模组',
          missingMods: '缺少 {count} 个',
          downloaded: '已下载',
          notDownloaded: '未下载',
          noMods: '该候选房间没有引用 Workshop 模组。',
          diagnostics: '兼容性说明',
          notReady: '正在准备兼容报告',
          notReadyDescription: '分析完成后即可查看候选房间并配置部署方案。',
          worldColumns: {
            world: '分片',
            role: '角色',
            shard: 'Shard ID',
            ports: '服务器 / 验证 / 主服务端口',
            sessions: 'Session 数'
          },
          modColumns: {
            id: 'Workshop ID',
            worlds: '使用分片',
            status: '资源库状态'
          }
        },
        apply: {
          title: '部署方案',
          description: '替换现有房间时，系统会保留 Token、端口和各世界当前的运行位置，并在发布前创建保护备份。',
          roomsLoadFailedTitle: '目标房间状态读取失败',
          roomsLoadFailed: '无法读取目标房间列表，替换操作暂不可用。',
          action: '开始部署',
          mode: {
            label: '部署方式',
            new: '新建房间',
            newDescription: '在管理中心本机创建一个新房间。',
            replace: '替换现有房间',
            replaceDescription: '支持本机、远程或混合房间，自动停服并恢复运行状态。',
            clone: '克隆为新房间',
            cloneDescription: '在管理中心本机用新目录发布副本。'
          },
          newLocalOnlyTitle: '新房间只创建在本机',
          newLocalOnlyDescription: '当前新建和克隆不会直接创建到远程节点；如需导入远程或混合房间，请选择“替换现有房间”。',
          targetRoom: '目标房间',
          selectTargetRoom: '选择要替换的房间',
          replaceDescription: '房间可以正在运行。系统会自动停止全部世界，按原位置完成恢复，再重新启动原先运行的世界。',
          confirmation: '替换确认',
          confirmationPlaceholder: '输入完整目标房间名称',
          confirmationDescription: '请输入“{name}”确认覆盖。',
          directoryName: '新房间目录',
          directoryDescription: '仅可使用字母、数字、下划线和横线，最长 64 个字符。',
          roomName: '游戏内房间名称',
          tokenPolicy: {
            label: 'Token 策略',
            source: '使用存档中的 Token',
            preserve: '保留目标房间 Token',
            provided: '输入新的 Token',
            none: '暂不设置 Token',
            descriptions: {
              source: '复制并校验压缩包中的 cluster_token.txt。',
              preserve: '替换房间时继续使用目标房间现有 Token。',
              provided: '将输入内容保存为目标房间 Token。',
              none: '房间将无法正常连接 Klei 服务，除非稍后补充 Token。'
            }
          },
          clusterToken: '新的服务器 Token',
          clusterTokenPlaceholder: '粘贴 cluster_token.txt 的内容',
          networkPolicy: {
            label: '端口策略',
            auto: '自动分配无冲突端口',
            source: '保留存档端口',
            preserve: '保留目标房间端口',
            descriptions: {
              auto: '根据本机已管理房间自动分配服务器、验证和主服务端口。',
              source: '原样使用压缩包中的端口，存在冲突时部署会失败。',
              preserve: '替换房间时沿用目标房间当前端口。'
            }
          },
          modPolicy: {
            label: '模组策略',
            install_missing: '自动下载缺失模组',
            require_downloaded: '要求模组已下载',
            preserve: '保留配置，暂不下载',
            descriptions: {
              install_missing: '部署过程中通过 SteamCMD 下载缺失模组及其依赖。',
              require_downloaded: '如有任一模组不在本机，部署立即停止。',
              preserve: '保留每个分片的 modoverrides.lua，缺失模组不会自动补齐。'
            }
          },
          allowPartial: '允许缺少主世界的高级分片导入',
          allowPartialDescription: '仅在你明确知道该分片用途时启用。普通房间必须包含一个主世界。',
          allowMissingToken: '确认暂时不配置 Token',
          allowMissingTokenDescription: '没有 Token 的专服通常无法被玩家正常发现或加入。',
          replaceWarningTitle: '目标房间将被替换',
          replaceWarningDescription: '系统会先创建完整保护备份，再自动停止房间内全部世界并统一恢复。失败时会回滚，成功后恢复原先的运行状态。',
          validation: {
            candidateRequired: '请选择一个候选房间。',
            candidateBlocked: '该候选房间存在阻止部署的兼容问题。',
            targetRequired: '请选择要替换的目标房间。',
            confirmationMismatch: '替换确认必须与目标房间名称完全一致。',
            directoryInvalid: '新房间目录格式无效或超过 64 个字符。',
            tokenRequired: '请输入有效的服务器 Token。',
            missingTokenNotAllowed: '请提供 Token，或明确确认暂时不配置 Token。',
            partialNotAllowed: '此存档没有主世界，必须明确允许高级分片导入。'
          }
        },
        jobs: {
          analyzing: '正在深度分析存档',
          applying: '正在原子部署存档'
        },
        delete: {
          title: '删除导入记录',
          description: '删除上传文件、解压内容和兼容报告。已经部署的房间不会被删除。',
          warningTitle: '此操作不可撤销',
          warningDescription: '部署后的房间和保护备份不受影响。',
          confirmation: '删除确认',
          confirmationDescription: '请输入“{name}”确认删除。'
        },
        feedback: {
          unsupportedFormat: '仅支持 ZIP、TAR、TAR.GZ 和 TGZ 存档。',
          uploaded: '存档已上传，正在进行深度分析。',
          uploadFailed: '上传存档失败：{error}',
          analysisStarted: '已重新提交存档分析任务。',
          analysisFailed: '无法启动存档分析：{error}',
          analyzed: '存档兼容性分析完成。',
          detailsFailed: '读取兼容报告失败：{error}',
          applyStarted: '部署任务已启动。',
          applied: '存档已安全部署到目标房间。',
          applyFailed: '无法启动存档部署：{error}',
          jobFailed: '存档任务失败：{error}',
          jobStatusFailed: '存档任务状态读取失败：{error}',
          jobStatusTimedOut: '存档任务状态确认超时，任务可能仍在后台运行。页面会继续自动刷新，也可稍后手动刷新复核。',
          completedRefreshFailed: '存档任务已完成，但最新导入状态读取失败，当前继续显示上次数据。',
          roomsRefreshFailed: '存档已部署，但目标房间状态读取失败，请刷新后复核。',
          deleted: '导入记录已删除。',
          deleteFailed: '删除导入记录失败：{error}'
        }
      },
      actions: {
        create: '创建备份',
        import: '导入存档',
        backToBackups: '返回备份管理',
        refresh: '刷新',
        reload: '重新加载',
        download: '下载',
        restore: '恢复',
        delete: '删除',
        confirmCreate: '创建'
      },
      list: {
        loadFailed: '备份列表加载失败',
        title: '备份列表',
        description: '下载、恢复或删除现有世界存档备份。',
        archivePlaceholder: '选择存档',
        allArchives: '全部',
        columns: {
          name: '备份名称',
          archive: '存档名称',
          size: '大小',
          createdAt: '创建时间',
          actions: '操作'
        },
        loading: '正在加载备份',
        empty: '暂无备份',
        emptyDescription: '当前存档还没有可用备份。'
      },
      createDialog: {
        title: '创建存档备份',
        description: '选择需要立即备份的房间存档。',
        archive: '存档',
        archivePlaceholder: '请选择存档'
      },
      restoreDialog: {
        title: '恢复存档备份',
        description: '将备份内容覆盖到原房间存档。',
        backupFile: '备份文件：',
        sourceArchive: '源存档：',
        overwriteTitle: '将覆盖原存档',
        overwriteDescription: '此操作无法撤销，请确保已备份重要数据。',
        originalOnly: '当前后端暂不支持恢复为新房间，因此这里只提供原房间恢复。'
      },
      feedback: {
        withDetail: '{message}：{detail}',
        listUnavailable: '服务未返回可用的备份列表',
        serviceUnavailable: '无法连接备份服务',
        listFailed: '获取备份列表失败：{error}',
        noArchives: '没有可用的存档',
        archiveListFailed: '获取存档列表失败：{error}',
        selectArchive: '请选择要备份的存档',
        created: '创建备份成功',
        createFailed: '创建备份失败：{error}',
        downloading: '正在下载备份：{name}',
        downloadFailed: '下载备份失败：{error}',
        noBackupSelected: '未选择备份文件',
        restoreConfirm: '您确定要恢复此备份到原存档吗？此操作将覆盖原存档所有内容且无法撤销！',
        restoreTitle: '恢复备份',
        restoreButton: '确认恢复',
        restoreCanceled: '已取消恢复操作',
        restored: '备份恢复成功',
        restoreFailed: '恢复备份失败：{error}',
        deleteConfirm: '确定要删除备份文件“{name}”吗？此操作不可逆！',
        deleteTitle: '删除备份',
        deleteButton: '确认删除',
        deleteCanceled: '已取消删除',
        deleted: '备份删除成功',
        deleteFailed: '删除备份失败：{error}'
      }
    }
  },
  'en-US': {
    backups: {
      title: 'Backups',
      subtitle: 'Create, restore, and import complete room saves through one workflow for local and remote worlds.',
      tabs: {
        roomBackups: 'Room backups',
        saveImports: 'Save imports'
      },
      catalog: {
        title: 'Room backups',
        description: 'View every backup by room. New backups include every world automatically, regardless of where it runs.',
        consistencyTitle: 'Every new backup covers the complete room',
        consistencyDescription: 'New backups keep the room online by default. The system coordinates the same save across every world and verifies each one. Single-file backups created by older versions remain available in the same list.',
        partialLoadTitle: 'Some backup records are temporarily unavailable',
        columns: { worlds: 'Contents' },
        types: { history: 'Legacy backup' },
        historyRecord: 'Single-file backup created by an older version',
        completeRoom: 'Complete room',
        worldCount: '{verified}/{total} worlds verified'
      },
      imports: {
        upload: {
          title: 'Upload a local save',
          description: 'The archive is inspected for directories, shards, ports, tokens, and Workshop mods before anything can replace an existing room.',
          file: 'Save archive',
          fileDescription: 'Supports ZIP, TAR, TAR.GZ, and TGZ files up to 16 GiB.',
          name: 'Import name',
          namePlaceholder: 'Uses the file name when empty',
          nameDescription: 'Identifies this import record only. It does not change the in-game room name.',
          action: 'Upload and analyze',
          uploading: 'Uploading'
        },
        list: {
          title: 'Import records',
          description: 'Review uploaded save compatibility and deploy one recognized room candidate.',
          loadFailed: 'Could not load import records',
          loading: 'Loading import records',
          empty: 'No import records',
          emptyDescription: 'Upload a DST save archive to generate its compatibility report.',
          columns: {
            name: 'Import name',
            source: 'Source file',
            size: 'Size',
            status: 'Status',
            createdAt: 'Uploaded',
            actions: 'Actions'
          }
        },
        actions: {
          details: 'View compatibility report',
          analyze: 'Analyze again',
          delete: 'Delete import record'
        },
        statuses: {
          uploaded: 'Uploaded',
          analyzing: 'Analyzing',
          ready: 'Ready to deploy',
          invalid: 'Invalid save',
          applying: 'Deploying',
          applied: 'Deployed',
          unknown: 'Unknown status'
        },
        compatibility: {
          ready: 'Compatible',
          needs_attention: 'Needs review',
          blocked: 'Blocked',
          unknown: 'Unknown compatibility'
        },
        severities: {
          info: 'Information',
          warning: 'Needs review',
          error: 'Blocks deployment'
        },
        roles: {
          master: 'Master world',
          caves: 'Caves',
          custom: 'Custom shard'
        },
        diagnostics: {
          MULTIPLE_CLUSTERS: 'Multiple DST rooms were found in this archive and can be imported separately.',
          WRAPPED_CLUSTER_ROOT: 'The save is wrapped in a subdirectory. The wrapper will be removed automatically.',
          INVALID_CLUSTER_INI: 'cluster.ini could not be parsed.',
          CLUSTER_TOKEN_MISSING: 'The save has no cluster_token.txt. Choose a token policy before deployment.',
          DUPLICATE_PORT: 'Multiple shards use port {port}. Automatic port allocation can fix this.',
          NO_WORLDS: 'No shard containing server.ini was found.',
          MASTER_MISSING: 'No master world was detected. This requires an explicitly confirmed advanced shard import.',
          MULTIPLE_MASTERS: 'Multiple master worlds were detected, so this candidate cannot be deployed directly.',
          WORKSHOP_MODS_MISSING: '{count} Workshop mods are not downloaded locally. Their configuration will be preserved.',
          INVALID_SERVER_INI: 'server.ini could not be parsed.',
          WORLD_SESSION_MISSING: 'This shard has no existing session and will start as a new world configuration.',
          WORKSHOP_MODS_NOT_INSTALLED: 'Mod configuration was preserved, but missing Workshop mods were not downloaded.'
        },
        errors: {
          UNSAFE_ARCHIVE: 'The archive contains an unsafe path, link, or conflicting file.',
          ARCHIVE_TOO_LARGE: 'The archive exceeds the upload or extraction safety limit.',
          INVALID_ARCHIVE: 'No importable DST save was recognized, or the archive content is invalid.',
          IMPORT_ANALYSIS_FAILED: 'Save analysis failed.',
          SAVE_IMPORT_APPLY_FAILED: 'Save deployment failed.',
          INSUFFICIENT_SPACE: 'The local node does not have enough free space for a safe deployment.',
          SAVE_IMPORT_BUSY: 'This save already has an active analysis or deployment job.',
          PORT_CONFLICT: 'Archive ports conflict with another local room. Use automatic port allocation.',
          SAVE_IMPORT_NOT_FOUND: 'The save import record does not exist.',
          SAVE_IMPORT_NOT_READY: 'Save analysis has not completed, so deployment cannot start yet.',
          SAVE_IMPORT_CANDIDATE_NOT_FOUND: 'The selected room candidate no longer exists. Analyze the archive again.',
          WORLD_RUNNING: 'At least one target shard is still running. Stop every shard and try again.',
          CLUSTER_TOKEN_REQUIRED: 'The selected token policy did not provide a usable server token.',
          WORKSHOP_MODS_MISSING: 'Required Workshop mods are still missing.',
          WORKSHOP_DOWNLOAD_MISSING: 'SteamCMD finished, but the downloaded mod files were not found.',
          ROOM_EXISTS: 'The target room directory already exists.',
          CONFIRMATION_REQUIRED: 'The operation confirmation does not match.',
          ROOM_NOT_MANAGED: 'The target room is not managed by this system.',
          PARTIAL_IMPORT_CONFIRMATION_REQUIRED: 'Importing shards without a master world requires explicit confirmation.',
          WORLD_TOPOLOGY_MISMATCH: 'The worlds in this save do not match the target room. Select a room with the same layout or adjust its worlds first.',
          unknown: 'The operation did not complete. Review the job error for details.'
        },
        details: {
          title: 'Save compatibility report',
          description: 'Review archive contents and configure a deployment plan for the selected room candidate.',
          loadFailed: 'Could not refresh the compatibility report',
          invalidTitle: 'This archive cannot currently be imported',
          lastFailureTitle: 'The previous operation did not complete',
          summary: 'Archive summary',
          format: 'Format',
          compressedSize: 'Compressed size',
          contentSize: 'Extracted size',
          fileCount: 'Files',
          candidate: 'Room candidate',
          selectCandidate: 'Select a room candidate',
          players: 'Up to {count} players',
          directory: 'Source directory',
          token: 'Server token',
          present: 'Included',
          absent: 'Not included',
          ignoredFiles: 'Ignored system files',
          worlds: 'Shards and ports',
          mods: 'Workshop mods',
          missingMods: '{count} missing',
          downloaded: 'Downloaded',
          notDownloaded: 'Not downloaded',
          noMods: 'This room candidate does not reference Workshop mods.',
          diagnostics: 'Compatibility notes',
          notReady: 'Preparing the compatibility report',
          notReadyDescription: 'Room candidates and deployment options appear after analysis completes.',
          worldColumns: {
            world: 'Shard',
            role: 'Role',
            shard: 'Shard ID',
            ports: 'Server / auth / master ports',
            sessions: 'Sessions'
          },
          modColumns: {
            id: 'Workshop ID',
            worlds: 'Used by',
            status: 'Library status'
          }
        },
        apply: {
          title: 'Deployment plan',
          description: 'Replacing a room preserves its token, ports, and current world locations, and creates a protection backup before publication.',
          roomsLoadFailedTitle: 'Could not load target room state',
          roomsLoadFailed: 'The target room list is unavailable, so replacement is temporarily disabled.',
          action: 'Start deployment',
          mode: {
            label: 'Deployment mode',
            new: 'Create room',
            newDescription: 'Create a new room on the controller host.',
            replace: 'Replace room',
            replaceDescription: 'Supports local, remote, or mixed rooms and restores their prior running state.',
            clone: 'Clone as new room',
            cloneDescription: 'Publish a copy under a new directory on the controller host.'
          },
          newLocalOnlyTitle: 'New rooms are created locally',
          newLocalOnlyDescription: 'Create and clone do not place a new room on a remote node yet. Choose Replace room to import into an existing remote or mixed room.',
          targetRoom: 'Target room',
          selectTargetRoom: 'Select a room to replace',
          replaceDescription: 'The room may be running. The system stops every world, restores each one at its current location, then restarts the worlds that were running before.',
          confirmation: 'Replacement confirmation',
          confirmationPlaceholder: 'Enter the complete target room name',
          confirmationDescription: 'Enter "{name}" to confirm replacement.',
          directoryName: 'New room directory',
          directoryDescription: 'Use letters, numbers, underscores, and hyphens only, up to 64 characters.',
          roomName: 'In-game room name',
          tokenPolicy: {
            label: 'Token policy',
            source: 'Use the archive token',
            preserve: 'Keep the target room token',
            provided: 'Provide a new token',
            none: 'Do not set a token yet',
            descriptions: {
              source: 'Copy and validate cluster_token.txt from the archive.',
              preserve: 'Continue using the existing target room token during replacement.',
              provided: 'Save the entered content as the target room token.',
              none: 'The room cannot connect to Klei services normally until a token is added.'
            }
          },
          clusterToken: 'New server token',
          clusterTokenPlaceholder: 'Paste the contents of cluster_token.txt',
          networkPolicy: {
            label: 'Port policy',
            auto: 'Allocate conflict-free ports',
            source: 'Keep archive ports',
            preserve: 'Keep target room ports',
            descriptions: {
              auto: 'Allocate server, authentication, and master ports around locally managed rooms.',
              source: 'Use archive ports unchanged. Deployment fails when they conflict.',
              preserve: 'Continue using the target room ports during replacement.'
            }
          },
          modPolicy: {
            label: 'Mod policy',
            install_missing: 'Download missing mods',
            require_downloaded: 'Require downloaded mods',
            preserve: 'Preserve configuration only',
            descriptions: {
              install_missing: 'Download missing mods and dependencies through SteamCMD during deployment.',
              require_downloaded: 'Stop deployment if any referenced mod is not available locally.',
              preserve: 'Keep each shard modoverrides.lua without downloading missing mods.'
            }
          },
          allowPartial: 'Allow advanced shard import without a master world',
          allowPartialDescription: 'Enable this only when you understand the shard layout. Normal rooms require one master world.',
          allowMissingToken: 'Confirm deployment without a token',
          allowMissingTokenDescription: 'A dedicated server without a token normally cannot be discovered or joined by players.',
          replaceWarningTitle: 'The target room will be replaced',
          replaceWarningDescription: 'A complete protection backup is created first. The system then stops every world and restores them together. Failures roll back, and success restores the previous running state.',
          validation: {
            candidateRequired: 'Select a room candidate.',
            candidateBlocked: 'This candidate has compatibility errors that block deployment.',
            targetRequired: 'Select a target room to replace.',
            confirmationMismatch: 'Replacement confirmation must exactly match the target room name.',
            directoryInvalid: 'The new room directory is invalid or exceeds 64 characters.',
            tokenRequired: 'Provide a valid server token.',
            missingTokenNotAllowed: 'Provide a token or explicitly confirm deployment without one.',
            partialNotAllowed: 'This save has no master world. Explicitly allow advanced shard import first.'
          }
        },
        jobs: {
          analyzing: 'Analyzing save contents',
          applying: 'Deploying save atomically'
        },
        delete: {
          title: 'Delete import record',
          description: 'Delete the uploaded file, extracted content, and compatibility report. Deployed rooms are not removed.',
          warningTitle: 'This action cannot be undone',
          warningDescription: 'Deployed rooms and protection backups are not affected.',
          confirmation: 'Deletion confirmation',
          confirmationDescription: 'Enter "{name}" to confirm deletion.'
        },
        feedback: {
          unsupportedFormat: 'Only ZIP, TAR, TAR.GZ, and TGZ saves are supported.',
          uploaded: 'The save was uploaded and deep analysis is running.',
          uploadFailed: 'Could not upload the save: {error}',
          analysisStarted: 'Save analysis was submitted again.',
          analysisFailed: 'Could not start save analysis: {error}',
          analyzed: 'Save compatibility analysis completed.',
          detailsFailed: 'Could not load the compatibility report: {error}',
          applyStarted: 'The deployment job started.',
          applied: 'The save was safely deployed to the target room.',
          applyFailed: 'Could not start save deployment: {error}',
          jobFailed: 'Save job failed: {error}',
          jobStatusFailed: 'Could not read save job status: {error}',
          jobStatusTimedOut: 'Save job status confirmation timed out. The job may still be running in the background. This page will keep refreshing automatically, or you can refresh it manually later.',
          completedRefreshFailed: 'The save job completed, but the latest import state could not be loaded. The previous data remains visible.',
          roomsRefreshFailed: 'The save was deployed, but target room state could not be loaded. Refresh and verify it.',
          deleted: 'The import record was deleted.',
          deleteFailed: 'Could not delete the import record: {error}'
        }
      },
      actions: {
        create: 'Create backup',
        import: 'Import save',
        backToBackups: 'Back to backups',
        refresh: 'Refresh',
        reload: 'Reload',
        download: 'Download',
        restore: 'Restore',
        delete: 'Delete',
        confirmCreate: 'Create'
      },
      list: {
        loadFailed: 'Could not load backups',
        title: 'Backup list',
        description: 'Download, restore, or delete existing world save backups.',
        archivePlaceholder: 'Select a save',
        allArchives: 'All',
        columns: {
          name: 'Backup name',
          archive: 'Save name',
          size: 'Size',
          createdAt: 'Created',
          actions: 'Actions'
        },
        loading: 'Loading backups',
        empty: 'No backups',
        emptyDescription: 'This save does not have any available backups.'
      },
      createDialog: {
        title: 'Create save backup',
        description: 'Select the room save to back up now.',
        archive: 'Save',
        archivePlaceholder: 'Select a save'
      },
      restoreDialog: {
        title: 'Restore save backup',
        description: 'Overwrite the original room save with this backup.',
        backupFile: 'Backup file:',
        sourceArchive: 'Source save:',
        overwriteTitle: 'The original save will be overwritten',
        overwriteDescription: 'This action cannot be undone. Make sure important data is backed up.',
        originalOnly: 'The current backend cannot restore into a new room, so only the original room can be restored.'
      },
      feedback: {
        withDetail: '{message}: {detail}',
        listUnavailable: 'The service did not return an available backup list',
        serviceUnavailable: 'The backup service is unavailable',
        listFailed: 'Could not load backups: {error}',
        noArchives: 'No saves are available',
        archiveListFailed: 'Could not load saves: {error}',
        selectArchive: 'Select a save to back up',
        created: 'Backup created',
        createFailed: 'Could not create backup: {error}',
        downloading: 'Downloading backup: {name}',
        downloadFailed: 'Could not download backup: {error}',
        noBackupSelected: 'No backup file is selected',
        restoreConfirm: 'Restore this backup to the original save? All current save data will be overwritten and this cannot be undone.',
        restoreTitle: 'Restore backup',
        restoreButton: 'Restore',
        restoreCanceled: 'Restore canceled',
        restored: 'Backup restored',
        restoreFailed: 'Could not restore backup: {error}',
        deleteConfirm: 'Delete backup file "{name}"? This cannot be undone.',
        deleteTitle: 'Delete backup',
        deleteButton: 'Delete',
        deleteCanceled: 'Deletion canceled',
        deleted: 'Backup deleted',
        deleteFailed: 'Could not delete backup: {error}'
      }
    }
  }
}

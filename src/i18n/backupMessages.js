export const backupMessages = {
  'zh-CN': {
    backups: {
      title: '备份管理',
      subtitle: '创建、下载、恢复和删除房间存档备份。',
      actions: {
        create: '创建备份',
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
      subtitle: 'Create, download, restore, and delete room save backups.',
      actions: {
        create: 'Create backup',
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

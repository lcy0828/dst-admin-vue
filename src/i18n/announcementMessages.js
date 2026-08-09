export const announcementMessages = {
  'zh-CN': {
    announcements: {
      title: '公告管理',
      subtitle: '发布并维护面向玩家和管理员的系统公告。',
      actions: {
        publish: '发布公告',
        refresh: '刷新',
        reload: '重新加载',
        view: '查看',
        edit: '编辑',
        delete: '删除',
        close: '关闭',
        save: '保存',
        submit: '确定'
      },
      list: {
        loadFailed: '公告列表加载失败',
        title: '公告列表',
        description: '管理面向玩家和管理员的系统公告。',
        filterPlaceholder: '状态筛选',
        columns: {
          title: '标题',
          publishedAt: '发布时间',
          expiresAt: '过期时间',
          status: '状态',
          actions: '操作'
        },
        loading: '正在加载公告',
        empty: '暂无公告',
        emptyDescription: '当前筛选条件下没有公告记录。'
      },
      statuses: {
        all: '全部',
        active: '有效',
        expired: '已过期'
      },
      important: '重要',
      detail: {
        title: '公告详情',
        description: '查看公告内容和生效时间。',
        publishedAt: '发布时间：{time}',
        expiresAt: '过期时间：{time}'
      },
      form: {
        createTitle: '创建公告',
        editTitle: '编辑公告',
        description: '设置公告内容、接收对象和过期时间。',
        title: '标题',
        titlePlaceholder: '请输入公告标题',
        content: '内容',
        contentPlaceholder: '请输入公告内容',
        expiresAt: '过期时间',
        target: '发送对象',
        targets: {
          all: '所有玩家',
          online: '在线玩家',
          admins: '管理员'
        },
        important: '重要公告',
        importantDescription: '重要公告将在列表中突出显示。'
      },
      validation: {
        titleRequired: '请输入公告标题',
        titleLength: '长度在 2 到 50 个字符',
        contentRequired: '请输入公告内容',
        expiresAtInvalid: '请选择有效的过期时间',
        expiresAtFuture: '过期时间必须晚于当前时间'
      },
      feedback: {
        unavailable: '无法连接公告服务',
        withDetail: '{message}：{detail}',
        listFailed: '获取公告列表失败：{error}',
        created: '创建公告成功',
        updated: '更新公告成功',
        createFailed: '创建公告失败：{error}',
        updateFailed: '更新公告失败：{error}',
        deleteConfirm: '确定要删除公告“{title}”吗？',
        deleteTitle: '删除公告',
        deleteButton: '删除',
        deleted: '删除公告成功',
        deleteCanceled: '已取消删除',
        deleteFailed: '删除公告失败：{error}'
      }
    }
  },
  'en-US': {
    announcements: {
      title: 'Announcements',
      subtitle: 'Publish and maintain system notices for players and administrators.',
      actions: {
        publish: 'Publish announcement',
        refresh: 'Refresh',
        reload: 'Reload',
        view: 'View',
        edit: 'Edit',
        delete: 'Delete',
        close: 'Close',
        save: 'Save',
        submit: 'Confirm'
      },
      list: {
        loadFailed: 'Could not load announcements',
        title: 'Announcement list',
        description: 'Manage system notices for players and administrators.',
        filterPlaceholder: 'Filter by status',
        columns: {
          title: 'Title',
          publishedAt: 'Published',
          expiresAt: 'Expires',
          status: 'Status',
          actions: 'Actions'
        },
        loading: 'Loading announcements',
        empty: 'No announcements',
        emptyDescription: 'No announcements match the current filter.'
      },
      statuses: {
        all: 'All',
        active: 'Active',
        expired: 'Expired'
      },
      important: 'Important',
      detail: {
        title: 'Announcement details',
        description: 'Review the announcement content and active period.',
        publishedAt: 'Published: {time}',
        expiresAt: 'Expires: {time}'
      },
      form: {
        createTitle: 'Create announcement',
        editTitle: 'Edit announcement',
        description: 'Set the content, recipients, and expiration time.',
        title: 'Title',
        titlePlaceholder: 'Enter an announcement title',
        content: 'Content',
        contentPlaceholder: 'Enter announcement content',
        expiresAt: 'Expiration time',
        target: 'Recipients',
        targets: {
          all: 'All players',
          online: 'Online players',
          admins: 'Administrators'
        },
        important: 'Important announcement',
        importantDescription: 'Important announcements are highlighted in the list.'
      },
      validation: {
        titleRequired: 'Enter an announcement title',
        titleLength: 'Use between 2 and 50 characters',
        contentRequired: 'Enter announcement content',
        expiresAtInvalid: 'Select a valid expiration time',
        expiresAtFuture: 'Expiration time must be in the future'
      },
      feedback: {
        unavailable: 'The announcement service is unavailable',
        withDetail: '{message}: {detail}',
        listFailed: 'Could not load announcements: {error}',
        created: 'Announcement created',
        updated: 'Announcement updated',
        createFailed: 'Could not create announcement: {error}',
        updateFailed: 'Could not update announcement: {error}',
        deleteConfirm: 'Delete announcement "{title}"?',
        deleteTitle: 'Delete announcement',
        deleteButton: 'Delete',
        deleted: 'Announcement deleted',
        deleteCanceled: 'Deletion canceled',
        deleteFailed: 'Could not delete announcement: {error}'
      }
    }
  }
}

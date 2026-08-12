# 本机运行服务登记

这份文件记录开发机上的正式运行目录和端口归属。它是重启本项目服务前的核对依据，不代表生产部署配置。

## 当前端口归属

| 端口 | 服务 | 正式运行目录 | 分支 | 管理方式 |
| --- | --- | --- | --- | --- |
| `5173` | Vue 3 前端 | `/Users/lcy/dst-admin-vue-v3` | `feature/vue3-in-place` | tmux `dst-admin-vue-5173` |
| `8000` | Go API | `/Users/lcy/dst-admin-go` | 以后端仓库登记为准 | tmux `dst-admin-api-8000` |

`/Users/lcy/dst-admin-vue` 的 `feature/v2-rebuild` 是另一条重构工作线，不是当前 `5173` 的正式运行目录。不得仅根据目录名、提交时间或测试是否通过，把它切换到 `5173`。

## 正式前端重启

只能从本仓库执行：

```bash
./scripts/restart-local-5173.sh
```

脚本会固定使用自身所在的工作区，校验正式分支和关键路由文件，只重启 `dst-admin-vue-5173`，然后验证监听进程的工作目录。它不会重启 `8000` 后端或 DST 的 Master/Caves 分片。

重启后至少检查：

```bash
curl -I http://127.0.0.1:5173/
curl -I 'http://127.0.0.1:5173/mods/list?roomId=cm9vbTE&worldId=TWFzdGVy'
curl -I http://127.0.0.1:5173/servers/commands
```

Vite 开发服务器对 SPA 路径返回入口 HTML，因此 HTTP `200` 只能证明路由入口未被服务器拒绝。涉及正式版本切换时，还必须核对 `src/router/index.js` 中的路由注册和对应页面文件。

## 2026-08-12 切换事故

- `2026-08-11 22:31:33 +08:00`：`5173` 从 `/Users/lcy/dst-admin-vue-v3` 启动，下午仍正常提供完整页面。
- `2026-08-12 22:57:51 +08:00`：Codex 错误地把 `/Users/lcy/dst-admin-vue` 判断为“正式最新前端”，使用 `tmux respawn-pane -k` 将 `5173` 切换到 `feature/v2-rebuild`。
- 影响：`/mods/list`、`/servers/commands` 等未在该重构分支注册的页面变为 404，UI 和功能集合也发生变化。
- 根因：用“提交较新且检查通过”代替产品功能完整性判断；切换前未核对原进程工作目录，也未执行关键路由回归检查。
- `2026-08-13 01:17:00 +08:00`：`5173` 已切回 `/Users/lcy/dst-admin-vue-v3`，当时 HEAD 为 `e78298100047`，现有未提交工作保持不变。
- 恢复验收：`/`、`/mods/list?...`、`/servers/commands` 均返回 HTTP `200`；`8000` 和两个 DST 分片 PID 未变化。

## 后续切换规则

1. 先记录当前监听 PID、进程工作目录、Git 分支和 HEAD。
2. 对比候选版本的路由与核心功能清单，不能只看提交时间和测试结果。
3. 只重启用户指定的服务；切换前后核对其他管理服务和 DST 分片 PID。
4. 使用受管脚本完成 `5173` 重启，禁止手写另一个工作目录的 `tmux respawn-pane` 命令。
5. 只有关键路径和实际页面行为验收通过后，才把候选工作区登记为正式运行目录。

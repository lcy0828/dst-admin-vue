# DST Admin Web

**简体中文（默认）** | [English](README.en.md)

DST Admin Web 是 DST Admin 的浏览器管理界面，与 [`dst-admin-go`](https://git.luocaiyi.top/dst/dst-admin-go) 共同组成同一个《饥荒联机版》服务器管理项目。

普通服主不需要单独部署或启动这个前端。All-in-One 和原生安装会把页面构建后交给 Go 管理服务，通过同一个地址提供 Web 页面和 API。

## 可以管理什么

- 房间和 Master、Caves 等世界分片。
- 玩家、角色状态、聊天和实时日志。
- Steam Workshop 模组及每个世界的配置。
- 手动备份、定时备份、存档导入和恢复。
- 查看本机与 Agent 的游戏安装、安装或接入已有服务端、更新游戏及管理 LuaJIT2。
- 本机资源、远程机器及房间的世界运行位置。

## 从这里开始

完整安装入口在 [DST Admin 主 README](https://git.luocaiyi.top/dst/dst-admin-go)。

前后端仓库相邻时，可直接阅读：

- [安装与启动指南](../dst-admin-go/docs/startup-guide.md)：Linux/macOS 原生安装、Agent 接入和存档保护。
- [开发启动说明](../dst-admin-go/docs/development.md)：独立配置、Go API、Vite 代理与同源运行。
- [游戏安装管理](../dst-admin-go/docs/game-installation-management.md)与 [LuaJIT 安装](../dst-admin-go/docs/luajit-installation.md)。

以上相邻路径供本地检出阅读；在线阅读请从后端主 README 的对应文档链接进入。

当前项目仍是源码预览版本。安装时必须使用匹配的前后端：

- 后端：`feature/v2-rebuild`
- 前端：`master`

推荐在 x86_64 Linux 服务器上使用 Docker All-in-One。2 核 4 GB 机器优先只运行 Master 和 Caves。

## 正式访问地址

| 部署方式 | 默认地址 |
| --- | --- |
| Docker All-in-One | `http://服务器IP:8080` |
| Linux 原生安装 | `http://服务器IP:8000` |
| macOS 原生安装 | `http://127.0.0.1:8000` |

`5173` 仅用于源码调试，不是普通服主的正式入口。生产环境不需要单独运行 Vite。

## 前端开发启动

使用 Node.js 24 LTS 和 npm。在本仓库执行：

```bash
npm ci
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

默认将 `/api` 代理到 `http://127.0.0.1:8000`，后端需另行启动。
从零准备后端请按上面的开发启动说明操作。访问 `http://127.0.0.1:5173`。
已有服务占用 `5173` 时，不直接终止它；换端口调试，或遵循本仓库的
[已登记本机服务说明](docs/local-runtime.md)。

后端使用其他端口时，例如 `18080`：

```bash
VITE_API_PROXY_TARGET=http://127.0.0.1:18080 \
  npm run dev -- --host 127.0.0.1 --port 15173 --strictPort
```

`VITE_API_BASE_URL` 默认 `/api`，通常保持不变。`VITE_*` 会进入浏览器代码，不存放密钥。

## 构建与验证

```bash
npm test
npm run lint
npm run build
```

构建产物在 `dist/`。生产 Go 服务通过 `DST_ADMIN_WEB_ROOT` 指向该目录，
与 `/api/v2` 使用同一地址。单独运行 `npm run preview` 只提供静态预览，不包含管理后端。
前后端升级时一起更新匹配的产物，保留管理配置、数据库和存档。

## 使用前注意

- Web 页面能打开不代表 DST 的 UDP 游戏端口已经可以从公网访问。
- 模组下载后还需要添加到房间；启用或修改配置后需要重启对应世界。
- All-in-One 的配置、存档、游戏文件、模组和备份默认保存在宿主机 `/opt/dst`。
- 单机和 All-in-One 不需要额外 Agent；只有管理其他机器时才需要添加 Agent。
- 世界停止后显示的季节、天数等快照会标记为已过期，不代表世界仍在运行。

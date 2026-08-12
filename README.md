# DST Admin Vue

《饥荒联机版》(Don't Starve Together) 专用服务器管理系统的 Vue 3 前端。项目面向自建服务器的个人玩家、社区服管理者和需要管理多个房间的商用部署者。

前端默认以本机管理为主，远程节点单独配置。所有业务页面读取真实后端数据，不使用演示数据替代接口结果。

## 产品原则

- 新手能直接完成启动世界、安装模组、查看玩家和创建备份等日常操作。
- 熟练用户仍可使用实时日志、Lua 控制台、规则和自动化任务等完整能力。
- 当前房间和世界始终作为操作上下文，危险操作需要明确确认。
- 加载中、暂无数据、接口失败和功能不可用使用不同状态表达。
- 保留紧凑的运维效率，但不以牺牲可理解性为代价。
- 本机是默认管理目标；远程配置和本机配置相互独立。

## 当前功能

- 服务器工作台：世界状态、启动、停止、重启、实时日志和 Lua 控制台。
- 房间与世界：房间管理、世界配置、天数和季节状态。
- 玩家管理：在线状态、详情、私信、踢出、封禁和名单管理。
- 模组管理：Workshop 搜索、下载、更新、启停和真实配置编辑。
- 备份与恢复：备份创建、列表、下载、恢复和删除。
- 日志与自动化：日志查询、规则、解析器和定时任务。
- 运行目标：本机优先，并可单独配置远程 Agent。
- 系统管理：资源状态、服务端版本、macOS 安装方式提示和主题预设。

## 当前边界

- 前端需要配合 `dst-admin-go` 后端及其 `/api/v2` 接口使用。
- 远程 Agent 的配置和状态已接入；远程房间、世界、模组和备份传输尚未完成时，前端会阻止这些请求落到本机。
- Lua 控制台作为兼容复杂模组和特殊管理命令的高级入口保留，并要求输入目标房间名确认。

## 技术栈

- Vue 3.5
- Vue Router 4
- shadcn-vue（Reka UI）与 Tailwind CSS 4
- Lucide Vue、vue-sonner
- Vite 8、Axios、ECharts、xterm.js

## 本地开发

环境要求：Node.js `20.19+` 或 `22.12+`，以及运行在本机或可访问地址上的 `dst-admin-go` 后端。

```bash
cp .env.example .env
npm install
npm run dev
```

开发服务默认地址为 `http://127.0.0.1:5173`，API 默认代理到 `http://127.0.0.1:8000`。需要连接其他后端时修改 `.env`：

```dotenv
VITE_API_BASE_URL=/api
VITE_API_PROXY_TARGET=http://127.0.0.1:8000
```

本机长期运行的端口归属、受管重启方式和切换事故记录见 [`docs/local-runtime.md`](docs/local-runtime.md)。重启正式 `5173` 时使用 `./scripts/restart-local-5173.sh`，不要在相邻工作区中直接执行 `npm run dev -- --port 5173`。

## 质量检查

```bash
npm run lint -- --no-fix
npm test
npm run build
```

当前仓库没有 `api:generate` 或浏览器 `test:e2e` 脚本，不应把它们写入发布命令。真实功能状态、远程边界和人工验收项见 [`docs/DST_ADMIN_FUNCTION_TRUTH.md`](docs/DST_ADMIN_FUNCTION_TRUTH.md)。

视觉和交互约束记录在 [`design-system/dst-admin-vue-3/MASTER.md`](design-system/dst-admin-vue-3/MASTER.md)。

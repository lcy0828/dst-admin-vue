# DST Admin Web

**简体中文（默认）** | [English](README.en.md)

DST Admin 的前端开发仓库。**部署只需查看 [DST Admin 主仓库](https://github.com/lcy0828/dst-admin-go)**，那里提供完整镜像、原生安装包、初始化、游戏安装和升级说明。管理服务在打包时内嵌页面，服主不需要单独部署本仓库。

## 版本

- `master`：当前 Vue 3 正式前端，主仓库打包时默认获取它的最新提交。
- `legacy/vue2-original`：保留的旧 Vue 2 版本，不参与当前发布。

## 开发

使用 Node.js 22+ 和 npm。准备后端 API 后执行：

```bash
npm ci
VITE_API_PROXY_TARGET=http://127.0.0.1:8000 npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

访问 `http://127.0.0.1:5173`。默认 `/api` 代理至 `http://127.0.0.1:8000`。已有服务占用端口时选择其他端口和独立数据目录，不终止已有服务。完整环境步骤见主仓库[开发指南](https://github.com/lcy0828/dst-admin-go/blob/feature/v2-rebuild/docs/development.md)。

`VITE_API_BASE_URL` 默认 `/api`；`VITE_*` 会进入浏览器代码，不得存放密钥。

## 验证与构建

```bash
npm run lint -- --no-fix
npm test
npm run build
```

输出为 `dist/`。主仓库打包流程构建该版本并嵌入 Go 二进制，记录准确前端提交号。`npm run preview` 只用于静态预览。开发调试可用后端 `DST_ADMIN_WEB_ROOT` 显式指向 `dist/`；正式安装无需设置。

界面默认中文并支持英文，翻译维护见[国际化说明](docs/internationalization.md)。内部进度、讨论和本机环境记录放在忽略目录 `.local-docs/`，不随发布上传。

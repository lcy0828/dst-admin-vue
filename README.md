# DST Admin Web

**简体中文** | [English](README.en.md)

DST Admin 的 Vue 3 前端。部署请查看 [DST Admin 主仓库](https://github.com/lcy0828/dst-admin-go)，安装包和镜像已内置页面。

## 开发

使用 Node.js 22+，后端默认地址为 `http://127.0.0.1:8000`。

```bash
git clone --branch master https://github.com/lcy0828/dst-admin-vue.git dst-admin-vue-v3
cd dst-admin-vue-v3
npm ci
npm run dev
```

通过 `VITE_API_PROXY_TARGET` 修改后端地址。详细步骤见[开发指南](https://github.com/lcy0828/dst-admin-go/blob/master/docs/development.md)。

## 检查与构建

```bash
npm run lint -- --no-fix
npm test
npm run build
```

构建产物位于 `dist/`。[国际化说明](docs/internationalization.md)。

`master` 为当前版本，旧 Vue 2 版本保留在 `legacy/vue2-original`。

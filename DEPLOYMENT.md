# Railway 部署

应用版本 0.1.1。部署输出为手机 H5，微信小程序产物另行提交至微信开发者工具。本服务没有在线 AI 后端和数据库，学习记录及录音仍在用户本机。

## 现有项目

- 仓库：`zmq18560817115-eng/kaikouyingke`，分支 `main`。
- Railway 项目：`splendid-warmth`，环境 `production`，服务 `kaikouyingke`。
- [打开项目](https://railway.com/project/f199c42a-d33c-4d17-8f1a-c9017948a910?environmentId=ec08820b-7ac5-4a7b-b1d0-82f72d238255)。

## 构建和启动

仓库根目录提供 `Dockerfile`、`.dockerignore` 和 `railway.toml`，解决应用代码位于 `mobile` 子目录、根目录没有启动命令的问题。

1. 服务 Source 连接上述仓库与 `main`；Root Directory 可使用仓库根目录 `/`（推荐），也兼容已有 `/mobile` 设置。
2. 根目录部署使用 `/railway.toml`；若 Root Directory 为 `/mobile`，配置文件路径使用 `/mobile/railway.toml`。采用 Dockerfile 构建，无需另填 Build Command。
3. 镜像在 Node.js 22 中执行 `mobile/npm ci`、`npm run build:h5`，运行层只复制网页产物与服务脚本。
4. 启动 `node scripts/serve-h5.mjs`，监听 `0.0.0.0:$PORT`；`PORT` 由 Railway 注入，无需固定 5174。
5. 健康检查 `/healthz`，成功返回 HTTP 200 与版本号。公开访问在 Networking 中生成 Railway 域名，使用 HTTPS。

不要把开发命令 `npm run dev` 设为生产启动命令。仓库根目录和 `mobile` 内各提供匹配的 Dockerfile；两种 Root Directory 都可构建同一个运行服务。不要交叉使用根目录 Dockerfile 与子目录构建上下文。

## 本机生产验证

```sh
cd mobile
npm ci
npm test
npm run build:h5
PORT=3000 npm start
```

打开 `http://127.0.0.1:3000/`；健康检查为 `http://127.0.0.1:3000/healthz`。支持 GET/HEAD，缺失资源返回 404，HTML 每次校验，带哈希资源可长期缓存。容器以非 root 用户运行，不复制原始资料、验收截图、环境密钥或开发依赖到运行层。

## 发布确认

推送成功与部署成功分开核对：Railway 必须针对最新 Git 提交显示成功，随后公开域名首页、JS/CSS/图片和 `/healthz` 都需验证。健康检查是部署就绪检查，不是持续监控。

若失败，先看 Build Logs 判断依赖安装/编译问题，再看 Deploy Logs 判断启动路径、PORT 和健康检查问题。不要清除用户浏览器数据来解决服务器部署故障。

配置依据：[Railway 配置文件](https://docs.railway.com/config-as-code/reference)、[子目录项目](https://docs.railway.com/deployments/monorepo)、[健康检查](https://docs.railway.com/deployments/healthchecks)。

## 已发布版本（2026-10-16）

- 正式访问：<https://kaikouyingke-production.up.railway.app/>。
- 应用版本：0.1.1；代码提交 `af70d69274b84f99276c6d5f835e333f007acfbb`。
- Railway 部署 `bbcd394a-f9e5-4736-a88b-f942a1e5cc8a` 状态 `SUCCESS`，容器监听 8080。
- 实际服务 Root Directory 为 `mobile`。失败日志确认：先前根目录 Dockerfile 的 `mobile/...` COPY 路径与子目录上下文不匹配；新增 `mobile/Dockerfile` 后构建成功。
- 正式首页与本机生产 HTML 一致；健康检查返回 `{"status":"ok","version":"0.1.1"}`，JS、CSS 和风景/商品图片均 HTTP 200；浏览器已实际打开首页。
- 使用 Railway 插件读取构建与运行日志并生成正式域名。用户学习记录、录音不会上传到该网页服务。

当前文档记录的是已验证的这次发布；后续提交的状态应以对应 Railway 部署为准。

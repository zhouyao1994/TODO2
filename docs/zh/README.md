# TODO2

> 本文件是对英文原文的中文翻译，仅供参考；如有出入，以英文原文为准。

一款空间化的待办事项应用：无限画布、多视图、本地优先存储。所有数据都保存在你的浏览器里 — 无需账号，没有服务器。

## 功能特性

- **画布视图** — 在无限空间画布上排布项目、便签和经过筛选的列表小部件，支持贴边对齐
- **列表视图** — 平铺任务列表，可按优先级、截止日期、成员、标签、组织或项目分组，支持已保存视图和纯文本导出
- **日历视图** — 月 / 周网格，支持拖拽改期与重复任务
- **自然语言输入** — 创建任务时可内联输入 `@person`、`#tag`、`/project`、`p1`–`p3` 以及日期关键词
- **键盘驱动** — 完整的快捷键体系：导航、编辑、批量操作，以及组合键切换视图
- **命令面板** — 快速访问各项操作与导航
- **本地优先** — 所有数据存于 IndexedDB，完全支持离线使用
- **文件同步** — 可选地通过 File System Access API 将数据保存 / 加载到磁盘上的 JSON 文件
- **深色与浅色主题**，强调色可自定义
- **两种构建目标** — 用于托管的在线构建，以及随处可用的单文件离线构建

## 使用方式

**在线版：** 通过 GitHub Pages 托管（在仓库 Settings > Pages > GitHub Actions 中启用）

**本地版：** 从最新构建下载 `todo2.html`，用浏览器打开即可 — 无需服务器。

## 开发

```
npm install
npm run dev
```

运行在 `http://localhost:5180`。

### 其他命令

| 命令 | 说明 |
|---------|-------------|
| `npm run build` | 生产构建 — 两种产物输出到 `dist/` |
| `npm run build:online` | 仅在线构建（`dist/index.html` + 静态资源，CDN 字体） |
| `npm run build:offline` | 仅离线构建（`dist/todo2.html`，单个自包含文件） |
| `npm test` | 运行测试 |
| `npm run test:watch` | 以 watch 模式运行测试 |
| `npm run lint` | 使用 ESLint 检查代码 |

### 构建产物

`npm run build` 会在 `dist/` 中产生两个文件：

| 文件 | 说明 |
|------|-------------|
| `index.html` | **在线版** — 标准构建，资源分离，字体从 Google Fonts CDN 加载，由 GitHub Pages 提供服务。 |
| `todo2.html` | **离线版** — 所有内容（JS、CSS、字体）内联进一个文件，可从 `file://` 直接打开，无需服务器或网络。 |

## 技术栈

- React 19 + TypeScript + Vite
- Zustand（状态管理）
- Dexie.js（IndexedDB 封装）
- React Flow（空间画布）
- dnd-kit（拖放）
- React Router v7

## 许可证

MIT

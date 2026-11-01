# TODO2

> 本文件是对英文原文的中文翻译，仅供参考；如有出入，以英文原文为准。

一款待办事项 Web 应用：以列排布小部件（列表、日历、笔记）的工作区、可保存的布局，以及本地优先存储。

## 架构
@docs/zh/ARCHITECTURE.md

## 构建与测试命令
- Node：≥ 22.13（package.json 中的 `engines` — 这是 jsdom 和 Vite 在 Node 22 上设定的下限）。GitHub Pages 部署（`.github/workflows/deploy.yml`）运行在 Node 22 / ubuntu-latest（UTC）：`npm ci` → `npm test`（vitest 运行失败会阻断部署；那里不运行 Playwright）→ `npm run build`。
- 安装：`npm install`
- 开发：`npm run dev` → http://localhost:5180
- 构建（两种产物）：`npm run build` → 先运行 `npm run lint`（硬性门槛 — 任何 lint 错误或警告都会使构建失败，包括 GitHub Pages 部署），然后产出 `dist/index.html`（在线版，CDN 字体）+ `dist/todo2.html`（离线版，单文件）。用它来验证，不要用 `tsc --noEmit`。
- 仅构建在线版：`npm run build:online`（同样受 lint 门槛约束）
- 仅构建离线版：`npm run build:offline`（同样受 lint 门槛约束）
- 测试：`npm test`（vitest + JSDOM）。两个项目：`isolated`（调用 `vi.mock`/`vi.doMock` 的文件，自动检测 — 每个文件独占全新 worker）和 `shared`（其余所有文件，`isolate: false`；`src/test/setup-shared.ts` 在每个文件边界重置 db / DOM / storage / 定时器 / 桩 / spy）。两个项目中，`src/test/setup.ts` 都会在每个测试前重置所有 store 与所有已注册的模块状态 — 在 store 之外持有状态的模块要调用 `registerModuleReset`（`utils/module-reset`）。
- 只测受影响的文件：`npx vitest related <changed src files> --run` — 迭代时使用；提交前完整跑一次 `npm test`
- 测试 watch 模式：`npm run test:watch`
- E2E：`npm run test:e2e`（Playwright，`fullyParallel`；在 5173 端口启动自己的 dev server — 与 5180 的 dev server 相互独立；`PW_PORT=<port>` 可换端口，因此两个 checkout 可以同时各跑各的套件）。单个 spec：`npx playwright test e2e/<name>.spec.ts`
- Lint：`npm run lint`（`eslint . --max-warnings 0`）。不允许按文件添加 ignore — 不要为了绕过修复而添加。
- 开发种子数据：`npm run seed:dev` → `dev-data/seed-v68.json`（已 gitignore；符合当前 schema 的真实导出，用于经 Settings → Import / Export → Import JSON 手动测试 — 会替换该浏览器的数据；日期相对今天生成，过期后重新运行）。需要 Node ≥ 22.6。

## 技术栈
- React 19 + TypeScript + Vite
- Zustand（状态管理）
- Dexie.js（IndexedDB，本地优先持久化）
- dnd-kit（拖放）
- React Router v7（data router：`createHashRouter` + `RouterProvider`）

## 工作原则
- **先验证，再动手。** 绝不臆测代码如何工作 — 修改前先读实际实现。追真实的调用链，核对真实类型，确认真实行为。不确定就读代码；不要猜。
- 如果一个修复涉及你没读过的逻辑，先读那段逻辑。错误的假设只会产出劣质代码。
- **不要给走捷径披上架构的外衣。** 当一个任务感觉很难时，不要把它合理化为“太脆弱”或“架构上太复杂”从而跳过，除非你真的尝试过并撞上了具体的墙。推迟之前先做约 15 分钟的试探。如果是因为时间而跳过，请直说（“完整版还需要约 N 分钟”）— 不要把它重新包装成架构约束。计划文档里的谨慎措辞（“这很脆弱”）是让你去尝试的提示，不是跳过的许可。

## 代码约定
- 组件放在 `src/components/`，路由页面放在 `src/views/`
- 数据层：`src/data/` 中的 repository 模式，`src/stores/` 中的 Zustand store — 例外是 `services/file-storage-store`，它是 `fileStorageService` 单例之上的 React 适配器（该 service 导入 stores，适配器若放在 `stores/` 会形成文件夹循环）
- 分层（自低向上）：`models` / `utils` → `data` → `stores` → `services` → `hooks` → `components` → `views`。模块只从自己这一层或更低的层导入 — services 编排 stores，绝不允许反向。`src/test/architecture/folder-cycles.test.ts` 对任何文件夹循环都会失败
- Models 是 `src/models/` 中的 TypeScript 接口
- 设计 token 使用 CSS 自定义属性，定义在 `src/styles/tokens.css`
- 不用 class 组件 — 只用带 hooks 的函数组件
- **TypeScript 严格性**：生产代码开启 `noUncheckedIndexedAccess`。优先用 `array.at(idx)` 或显式 `?? fallback`，而不是 `!`。对元组 / 已知形状 Record 的索引访问是类型安全的；运行时数组返回 `T | undefined`。
- **ESLint**：开启类型感知解析（`parserOptions.project: ['./tsconfig.app.json', './tsconfig.node.json', './tsconfig.test.json', './tsconfig.e2e.json']` — `tsconfig.test.json` 覆盖 `src/test/**` 且被 `tsc -b` 引用，因此构建会对测试做类型检查；`tsconfig.e2e.json` 覆盖 `e2e/**` + `playwright.config.ts`，仅用于 lint，不被 `tsc -b` 引用）；`src/test/**` 之外 `@typescript-eslint/no-explicit-any: 'error'`。手工编辑类型断言要走类型化辅助（如 `utils/file-picker.ts`）。

## 约束
- 本地优先、离线可用 — 所有数据在 IndexedDB，无后端
- 最小依赖 — 优先使用浏览器内建 API
- 深色主题为主（设计 token 在 tokens.css）

## 工具 — Chrome DevTools MCP
- 已接入 Chrome DevTools MCP 服务器 — 工具名为 `mcp__chrome-devtools__*`（延迟加载；首次调用前通过 `ToolSearch select:<name>` 加载 schema）。它驱动真实的 Chromium 实例：页面导航、点击 / 填写 / 拖拽、`take_snapshot`、`take_screenshot`、`evaluate_script`、`list_console_messages`、`list_network_requests`，以及 performance + lighthouse + memory。
- **在 JSDOM 不作数时使用它**：焦点交接、拖放命中测试（工作区标签页拖拽、列表小部件行、日历日期拖放）、弹出层锚点定位与视口翻转、ResizeObserver 驱动的布局、异步 store 驱动的重渲染时机，以及任何对照设计稿的视觉检查。
- **工作流**：先在 MCP 中针对 `npm run dev`（端口 5180）原型化交互，看清实际行为，然后把回归固化到 vitest（逻辑）或 Playwright（真实浏览器流程 — spec 在 `e2e/`，夹具在 `e2e/fixtures/` — 种子数据与受信任鼠标 `drag` 在 `workspace.ts`，已存储的行在 `db.ts`，几何工具在 `geometry.ts`）。MCP 是诊断 + 试探工具，不是回归层。
- **不要用它做**：纯逻辑 / model / store / Dexie 的工作 — 直接读源码。不要用 MCP 替代单元测试。

## Git 工作流
- 默认分支：`main` — 稳定、已部署的版本（推送到 `main` 即部署到 GitHub Pages）。没有 PR 流程。
- **进行中的工作：`feature/canvas-replacement`**（画布替换 + 增强 + bug 修复）。它的所有工作都提交到该分支，不提交到 `main`。基线 tag：`pre-canvas-replacement-2026-10-10`。
- 只有紧急热修复才进 `main`；之后把 `main` 合回功能分支。工作完成后通过 `git merge --no-ff` 落到 `main`。
- 定期推送功能分支 — `origin` 是唯一的机器外备份。
- 提交信息：祈使语气，不超过 72 字符
- 每个提交只做一个逻辑变更

## 计划
- 活动任务记录在 `docs/plans/TODO.md` — 会话开始时查看
- 开始多步骤功能前，在 `docs/plans/features/` 里创建计划
- 完成任务时更新 TODO.md
- 会话结束运行 `/closeout` 核对并更新文档
- `docs/plans/`、`docs/reviews/` 和 `.claude/` 按设计仅存本地（已 gitignore）— git 只保存应用本身。绝不 `git add -f` 它们。

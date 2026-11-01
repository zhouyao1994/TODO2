# 测试

> 本文件是对英文原文的中文翻译，仅供参考；如有出入，以英文原文为准。

测试体系的详细参考（`src/test/`、`e2e/`、`vitest.config.ts`、`playwright.config.ts`）。编写或调试测试时加载。总览见 `ARCHITECTURE.md` › Testing：哪一层负责验证什么。

## vitest（`npm test`）

| 抽象 | 位置 | 用途 |
|-------------|----------|---------|
| 项目 `isolated` / `shared` | vitest.config.ts | `isolated` — 任何调用 `vi.mock` / `vi.doMock` 的测试文件（在加载配置时检测），每个文件独占一个全新 worker，模块替身不会相互泄漏；`shared` — 其余所有文件，`isolate: false`（每个 worker 共享一个 jsdom + 模块缓存，这是大部分提速的来源）。`e2e/**` 不在这轮扫描范围内。测试 / 钩子的超时是 30 秒（机器负载高时，一个重测试可能耗时数倍于它常规的约 1 秒） |
| 每测试重置 | src/test/setup.ts, src/test/store-tracking.ts | **两个项目中的每个测试开始前**：所有 zustand store 恢复到 `getInitialState()`（setup 对 `vi.mock('zustand')` 的包装 `store-tracking.ts` 会在每个 store 创建时登记它），并运行 `utils/module-reset.resetModuleState()` — 每个在 store 之外持有状态的模块都在自身加载时注册自己的重置（`registerModuleReset` — 包括 `store-helpers` 中进行中的写入与加载、`fileStorageService`、`backupScheduler`、文件句柄缓存、file-storage 提示、笔记 store 的保存定时器 / 队列、设置 store 的操作系统主题监听器、list-order 的加载），因此新增的单例只需注册即可被覆盖，不依赖 setup 里维护一份清单 |
| 文件边界重置 | src/test/setup-shared.ts | **shared 项目在每个文件边界处**：补齐全新 worker 本会带来的其余清理 — 删除 Dexie 数据库、执行 Testing Library 的 `cleanup()`、清除 `<body>` / `<html>` 的属性 / storage / URL、恢复真实定时器、撤销全局 + 环境桩（包括文件直接定义在 `navigator` / `globalThis` 上的剪贴板桩，以及赋给 `HTMLInputElement.prototype.showPicker` 的 `vi.fn` — jsdom 本身没有这个 API），并还原 `vi.spyOn` 的 spy |
| 类型与 lint | tsconfig.test.json | `src/test/**` 由 `tsc -b` 做类型检查（应用的编译选项外加 Node 类型），并与其余代码一样带类型信息参与 lint |
| expectWithin | src/test/timing.ts | `expectWithin(ms, run)` — 用于“在大输入下仍保持快速”的检查：最多三次运行取最好成绩与上限比较（超线性退化会拖慢每一次运行，机器负载只会拖慢其中一次） |
| 文件夹循环 | src/test/architecture/folder-cycles.test.ts | 扫描 `src/` 中的所有相对导入（静态、动态、CSS、`composes … from`），构建文件夹图（`components/<area>`、其余顶层文件夹、各个顶层文件），发现任何循环即失败。它的边允许清单为空；一旦某条边不复存在，清单里残留的条目本身就会导致失败。它据此固定分层（自低向上）：`models` / `utils` → `data` → `stores` → `services` → `hooks` → `components` → `views` |
| 样式检查 | src/test/styles/ | 文本设计 token 的对比度、组件样式表中不得出现 `[data-theme]` 选择器、不得硬编码白色、每个 token 都被使用、每个 `var()` 都有定义 |
| 开发种子检查 | src/test/data/dev-seed.test.ts | 保持 `npm run seed:dev` 的产物（`scripts/dev-seed.ts` → `dev-data/seed-v68.json`，一份符合当前 schema 的真实导出 — 含 `Org:` 成员、`Project:` 标签、两个由带区持有其列表的布局、艾森豪威尔的列表、一个签到筛选、标记与跟进，日期相对运行当天）始终最新且干净：其版本必须等于 `CURRENT_DB_VERSION`（schema 升级必须同步更新种子 — 它的行类型由 models 定义），导入时没有任何警告，也不会给审计留下任何问题 |
| 导出夹具 | src/test/fixtures/v68-export.json | 一份处于下限版本（v68，旧版本构建升级后的产物：`Org:` 成员、`Project:` 标签、名为 `Lists from upgrade` 的布局）的小型完整导出 — 导入上限测试与缺表测试的输入。低于下限的数据没有夹具：它们会被直接拒绝，`import-pipeline.test` / `database-too-old.test` 用内联的文件与数据库验证这一点 |

## Playwright（`npm run test:e2e`）

| 抽象 | 位置 | 用途 |
|-------------|----------|---------|
| 配置 | playwright.config.ts | 仅 Chromium。在 5173 端口启动自己的 `npm run dev`，设置了 `PW_PORT` 时改用该端口（日常开发服务器是 5180；由于 `reuseExistingServer` 的存在，第二个 checkout 必须选自己的端口，否则测到的是第一个 checkout 的代码）、`--strictPort`、`trace: 'retain-on-failure'`、`fullyParallel`（每个测试都有独立的浏览器上下文，因此一个 spec 内的测试可以分布到多个 worker）。应用使用 hash 路由（`/#/`、`/#/settings`）。spec 等待的是应用状态（某个 locator、某条已存储的行、`whenIdle`、一次数据库轮转），绝不使用定时器等待（`waitForTimeout`）。CI（部署工作流）只运行 vitest 套件 — Playwright 仅在本地运行 |
| seedWorkspace, seedTaskList, drag, dragTab, dragRow, dragPanel, releaseDrag, wsCell, wsTab, wsBand, wsBandTabs, wsPanelHandle, wsListWidget, gotoSettingsDeepLink, openSettings | e2e/fixtures/workspace.ts | 直接把布局 / 列表 / 任务的种子数据写入 IndexedDB；驱动受信任的鼠标拖拽 — `drag(page, from, to, { lifted, during })` 会越过 5 px 激活距离，并以 `releaseDrag` 结束，它会等过 dnd-kit 拖拽后 50 ms 的点击屏蔽期，避免下一次点击被吞掉；`gotoSettingsDeepLink` / `openSettings` 打开设置弹窗，且不会与 `#/settings` 深链的副作用产生竞态 |
| Task-row locators, rowTitles | e2e/fixtures/seed.ts | 任务行的 locator，以及按显示顺序排列的标题 |
| readStore, readStores, writeStores, assignedNames, afterTransactionsOn | e2e/fixtures/db.ts | 直接读写应用的 IndexedDB；`afterTransactionsOn` 在应用对指定表的事务全部结束后 resolve |
| box, pointIn, expectInsideViewport, clickOutside | e2e/fixtures/geometry.ts | 几何辅助工具 |
| render counter, expectCounterLive | e2e/fixtures/render-count.ts | 通过在应用加载前安装的替代版 React DevTools 钩子（使用开发服务器下的组件名）统计指定组件的渲染次数，用于不依赖计时的“这次交互没有渲染任何行”检查。它依赖 React 的 fiber 内部实现，因此 `expectCounterLive` 会先证明它仍然能观察到渲染，React 的变更会让它明确地失败 |
| readSyncFile, attachSyncHandle, stubFilePermission, setPermissionAnswer, answerPermission | e2e/fixtures/sync-file.ts | `readSyncFile` 只在 `fileStorageService.whenIdle()` resolve 之后读取 OPFS 同步文件（在保存替换文件的过程中读取 `File` 会抛出 `NotFoundError`）；`attachSyncHandle` 以早前会话的方式存入同步文件的句柄；权限桩则编排浏览器对启动询问的各项回答 |
| built-csp | e2e/built-csp.spec.ts | 把两个构建目标产出到临时目录并运行它们（在线版经 http 提供，离线版从 `file://` 打开），要求没有任何 CSP 违规 |

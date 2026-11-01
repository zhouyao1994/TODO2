# 架构总览

> 本文件是对英文原文的中文翻译，仅供参考；如有出入，以英文原文为准。

本文件是随会话常驻加载的导览：什么在哪里，数据如何流动。每个模块的细节 — 它的函数、规则与边界情况 — 都在[详细参考](#详细参考)小节列出的参考文件里；按需加载所需的那份。

## 技术栈
- **前端**：React 19 + TypeScript，使用 Vite 构建
- **状态**：Zustand store
- **数据库**：Dexie.js 构建于 IndexedDB 之上（本地优先，无后端）
- **拖放**：dnd-kit
- **路由**：React Router v7 data router（`createHashRouter` + `RouterProvider`；一个 splat 路由渲染外壳的 `<Routes>`，因此 `useBlocker` 可用）
- **构建 + CSP**（`index.html` 里的一个 `<meta>`，处处 `base-uri 'none'; form-action 'none'`）：在线构建（`vite.config.ts`；`dist/index.html`）只从 `./assets` 加载脚本，因此它的 `cdnFonts` 插件去掉了 `script-src 'unsafe-inline'`（并加入 Google Fonts），`noInlineScripts` 遇到任何内联脚本都会使构建失败；离线单文件（`vite.config.offline.ts`；`dist/todo2.html`）为它唯一的内联脚本保留 `'unsafe-inline'`，并允许其内嵌的 `data:` 字体（`offlineCsp`）；它的图标同样使用 `data:` URL（SVG、.ico 的 16–64 px 位图、192 px PNG — `offlineIcons`），且不带 manifest 链接，因此该文件可以单独从磁盘运行。开发模式为 React 热刷新前导脚本保留 `'unsafe-inline'`

## 依赖关系图

分层自低向上 — 模块只从自己这一层或更低的层导入，`src/test/architecture/folder-cycles.test.ts` 对任何文件夹循环都会失败：`models` / `utils` → `data` → `stores` → `services` → `hooks` → `components` → `views`。services 编排 stores；没有任何 store 会导入 service。

```
main.tsx                  → 挂载 App
├── App.tsx               → hash 数据路由（`/` 工作区，`/settings` 为手机上的设置页 — 桌面端是设置弹窗的深链；旧页面路由重定向到 `/`）；应用外壳：顶栏、启动流程（`services/app-startup`）、设置弹窗、命令面板（`AppCommandPalette`）、键盘快捷键、全局对话框
├── styles/tokens.css     → 设计 token（经 `[data-theme]` 切换深色 / 浅色 — 这是唯一允许规则按主题分支的地方）+ 全局基础规则，包括唯一的 reduced-motion 规则
├── views/                → WorkspacePage（`/`：打开工作区 store，加载任务与实体，持有工作区 DndContext，守护未保存的修改）· SettingsPage（手机）
├── components/
│   ├── layout/           → TopBar（新建任务、布局标签页、屏幕筛选、搜索、Show N tasks — 已筛选任务面板的开关 —、StoragePill、齿轮；带测量式折叠）、StoragePill + sync-status（所有同步 / 备份警告）、手机的 SyncStatusButton 与 BottomTabBar
│   ├── workspace/        → WorkspaceView（顶部带区 · 列状的单元格 · 底部带区、分隔条、标签 / 面板拖拽）、WorkspaceCell + CellTabStrip、LayoutControls、UnsavedPrompt、MobileWorkspaceView；各小部件：list/（ListWidget、编辑列表）、calendar/、eisenhower/、dashboard/、NotesWidget
│   ├── task/             → TaskRow（桌面网格行）/ MobileTaskRow、TaskMenu、TaskEditPopup、TaskNotePopover、notes/（CodeMirror 笔记编辑器、笔记 → 任务）、dnd/
│   ├── overlays/         → CommandPalette、QuickAddBar、TaskDialog + TaskDialogContent（含手机的屏幕筛选栏，用于其已筛选任务）、FilteredTasksPanel（桌面：从顶栏托盘放下筛选出的任务 — 筛选折叠时在栏上方原位展开 — 覆盖在模糊遮罩上）、各对话框（数据库版本过旧 / 过新、同步冲突 / 升级 / 启动权限、清理、追加导入、批量确认、确认提示）、UndoSnackbar、FilterSheet（手机）
│   ├── checkin/          → CheckinDialog（邮件签到）、CheckinImportDialog（粘贴回函）
│   ├── settings/         → SettingsModal + sections/、实体编辑器（成员 / 状态 / 标签 / 主题颜色）、快捷键列表 / 编辑器
│   └── shared/           → DialogFrame、MenuPopover、Tooltip、选择器（ChipSelector、AnchoredPicker）、filters/（筛选片与筛选面板）、followup/、EntityMenu、icons
├── hooks/                → use-popover-anchor（所有弹出层的定位）、use-keyboard-shortcuts、use-built-list、use-widget-selection、use-dashboard-data、use-eisenhower-source、use-picker-order（勾选列表选择器的“已选置顶”排序）、小型 DOM / 媒体 / 时间 hooks
├── services/             → replace-data（所有数据替换）+ refresh-all、app-startup、file-storage（+ file-storage-store，唯一在 `stores/` 之外的 store）、command-registry + keyboard-shortcuts、NLP（解析器、解析、自动补全、选中即创建）、build-list + list-sections、stats/、checkin-email/ + checkin-reply/、create-task / task-draft、导出与导入（data-files、markdown、task-archive、purge-completed、append-import）、eisenhower-drop、remove-entities（设置中移除未使用的成员与标签）、migration-check
├── stores/               → Zustand：todo、person、status、tag、note、settings、workspace（布局 + 工作副本）、list-definition / list-draft / list-order / list-widget、filter、ui、undo、trend-events、file-ops（备份 / 审计状态）；safety-snapshot（备份闸门）与 store-helpers
├── data/                 → Dexie 数据库 + 各 repository、表注册表、导入管线（大小上限 → 版本检查 → schema 升级 → 校验）、schema-upgrades（升级注册表 — 下限处为空；一个 schema 步骤把它的变换放进 `upgrades/`）、restore、export、audit、backup-scheduler、draft-storage（为重新加载保留未保存的编辑）
├── models/               → TypeScript 接口：待办事项、列表定义（+ 持有者）、筛选谓词、工作区布局 + 小部件种类、仪表盘配置、艾森豪威尔设置、键盘快捷键、主题颜色
└── utils/                → 纯函数辅助：日期、重复规则、筛选（条件、匹配、取反、筛选片）、紧急度 / 热门 / 标记 / 艾森豪威尔面板、分组与排序、布局操作 + 拖放命中测试、行列、快捷键组合序列、dom-contract（非组件代码读取的 data 属性）、module-reset
```

## 数据流

1. **启动**（`services/app-startup.runAppStartup`）：`App.tsx` 先检查数据库版本（低于下限 → `DatabaseTooOldDialog`；由更新的构建保存 → `DatabaseTooNewDialog`：只能重新加载，不读取也不写入任何数据）。随后加载设置（主题、颜色覆盖）→ 同步文件重新连接（`fileStorageService.initialize()`）。当它的句柄需要重新授权时，启动流程会**先等待启动询问**（授权访问… / 不使用该文件继续），再运行其他任何逻辑。在用户解决分歧（冲突 / 文件更旧 / 文件不可读 → 一个对话框或一次暂停）之前，加载决定不会改动任何一侧；浏览器只是领先于一个未变化的文件时，会在备份文件文本之后写入该文件。随后各 store 加载。超过保留期的已完成任务**绝不会被静默清理**：清理提示会询问（导出并删除 / 删除 / 暂不），每 N 天至多一次，之后的某次同步文件加载后同样如此。`backupScheduler.start()` 每天做一次自动备份；每种备份各自在字节预算内保留最新的几份。
2. **日常使用**：UI → Zustand store → repository → Dexie。同步文件处于同步状态时，Dexie 钩子以防抖方式向它保存；暂停或等待授权期间只把浏览器标记为脏，由下一次加载裁决（文件未变化则写入，否则询问）。破坏性操作 — 数据替换、清理、超过五个任务的批量删除、移除未使用的成员与标签 — 都先备份（`takeSafetySnapshot`；备份失败会先询问再继续）。新任务经 `QuickAddBar` 创建（其 Details 移交给 `TaskEditPopup` 的创建模式）。
3. **数据替换**（`services/replace-data.replaceData`）— 设置导入与备份恢复、审计的清理、同步文件的加载、追加导入：先挂起笔记保存 → 安全快照 → 写入 → 各 store 重新加载（`refresh-all`；追加导入只重载任务相关 store 并保留撤销历史）→ `onDataReplaced` 监听器。文件（导入、备份、同步文件）都先经过导入管线读取：低于 schema 下限（`OLDEST_SUPPORTED_DB_VERSION`，v68）或没有版本号的文件一律拒绝 — 不读取、不写入 — 并给出提示，指明仍能转换它的更旧版本构建。
4. **工作区**：一个布局由若干列单元格加上下可选的整宽带区组成（带区是横跨工作区的单元格）。已存储的布局经布局修复读取（当前构建用不了的部分被丢弃；布局以未保存状态打开）。布局编辑会让工作副本处于未保存状态，直到 Save（期间保留在浏览器里，重载不丢，绝不写入数据库）；布局的顺序与视图状态（分隔条决定的面板尺寸、活动标签页、折叠、日历视图、行详情宽度）即时保存 — 未保存编辑所新增部分中的某个尺寸会随该编辑保留，直到 Save。在手机上一次只显示一列或一个带区。
5. **导航**：桌面端只有一个页面 — 顶栏之下的工作区；设置是覆盖其上的弹窗（齿轮、`G S`、命令面板、存储指示胶囊、`#/settings`），因此从不改变路由。在手机上，底部标签栏在 `/` 与 `/settings` 之间路由，工作区的 `useBlocker` 会在离开未保存的工作前询问。
6. **列表**：列表标签页把它的定义交给 `useBuiltList` 构建，并组合进顶栏（屏幕）筛选（收窄子句之间 AND，显示已完成 OR）。来自小部件的编辑进入 `list-draft-store` — 显示该列表的每个小部件都展示未保存的草稿，直到 Save 或 Revert；草稿在重载后保留。手动排序按列表各自保存，且即时保存。**每个列表都属于一个布局**（`owner: { layoutId }`），且只在该布局中被提供：布局 Save 时删除没有已保存标签页显示的列表，Save as 复制它显示的列表，Delete 把它们一并删除。艾森豪威尔有自己的隐藏列表（`owner: { eisenhower: true }`），由每个艾森豪威尔标签页和仪表盘的艾森豪威尔区块展示，并受应用级面板设置约束（Settings › Tasks › Eisenhower）。
7. **成员 / 标签**：经 `todoPeople` / `todoTags` 多对多关联，缓存在 person / tag store 的分配映射里。成员的可选邮箱是签到的收件地址。`Org: <name>` 成员与 `Project: <name>` 标签（来自旧的 org / project 迁移）只是命名约定。Settings › People, statuses & tags › Find unused…（Unused people & tags 对话框）列出没有任何任务使用的成员与标签（可选忽略已完成任务，并注明是哪些筛选器提到了它们），把勾选项连同其分配关系一起移除，作为一步撤销；提到它们的筛选器保留 id 但不再匹配，与单个删除后的行为一致。
8. **仪表盘**：每个数字都来自纯函数 `services/stats/*`，分别作用于屏幕筛选后的任务与全部任务（`shown of total`，已显示 / 总数）；趋势经 `trend-events-store` 读取 `todoEvents`。展示内容由该标签页的 `config` 决定，随布局一起保存。
9. **邮件签到**（不调用邮件 API）：`services/checkin-email` 在已保存的签到筛选之下，根据每个成员的未完成任务生成邮件（每个任务一个 `Ref`），交给邮件应用（剪贴板 + `mailto:`，或 `.eml` 草稿），并把任务标记为已跟进，作为一条撤销记录。回函通过粘贴返回：`checkin-reply` 解析它，与任务比对，把勾选的修改作为一个撤销组应用。

## 测试

两层体系，按要验证的内容选择（setup、夹具与辅助工具：[architecture/testing.md](architecture/testing.md)）：

- **vitest（`npm test`）** — `src/test/**` 下的单元 + JSDOM 测试：纯逻辑、models、repository、store、service、工具函数，以及不依赖真实布局、焦点或异步 DOM 时序的渲染 / 事件分发。两个项目（`isolated` 用于 mock 模块的文件，`shared` 用于其余）；每个测试前重置所有 store 与所有已注册的模块状态。
- **Playwright（`npm run test:e2e`）** — `e2e/**` 下仅 Chromium 的真实浏览器流程，跑在它自己的 dev server 上（端口 5173，或 `PW_PORT`）。spec 等待应用状态，绝不等待定时器。CI（部署工作流）只运行 vitest。

**JSDOM 不作数**的场景：焦点交接、`ResizeObserver` 驱动的布局、拖放命中测试、弹出层定位与视口翻转、异步 store 驱动的重渲染时机 — 这些需要 Playwright spec。

**诊断 vs. 回归。** Chrome DevTools MCP 服务器（`mcp__chrome-devtools__*`）是*试探*工具 — 在真实 Chromium 里现场驱动一次交互，然后在 Playwright 中固化回归。见 CLAUDE.md 的“工具 — Chrome DevTools MCP”。

**手动测试种子。** `npm run seed:dev` 把一份符合当前 schema 的真实导出写到 `dev-data/seed-v68.json`（已 gitignore），供 Settings → Import / Export → Import JSON 使用。

## 详细参考

每个参考文件都是一张 `Abstraction | Location | Purpose` 行的表格。

| 文件 | 内容 |
|------|--------|
| [architecture/models-and-data.md](architecture/models-and-data.md) | models（`src/models/`）、repository、schema 下限与升级注册表、校验、restore（`src/data/`） |
| [architecture/state.md](architecture/state.md) | Zustand store、筛选语义、store 辅助（`src/stores/`） |
| [architecture/components.md](architecture/components.md) | 视图、工作区 / 任务 / 覆盖层 / 共享 / 布局 / 设置组件、设计 token |
| [architecture/services-and-utils.md](architecture/services-and-utils.md) | services（数据替换、文件存储、build-list、NLP、统计、签到、导出）、hooks、纯函数 utils |
| [architecture/testing.md](architecture/testing.md) | vitest 项目与重置、Playwright 配置与夹具、架构与样式检查 |

---

**每当你新增模块或改变依赖关系图时，更新本文件（以及对应的参考文件）。**

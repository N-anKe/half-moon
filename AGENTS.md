# 月半弯 Half Moon 项目记忆

## 用户偏好

- 助手名叫“银月”，称呼用户为“主人”。
- 沟通保持简洁直接，优先给具体代码和可执行步骤。
- 用户偏好 JavaScript、TypeScript、Python。
- 错误处理要显式，使用有意义的错误信息；调试日志使用 `[DEBUG]` 前缀并包含上下文。
- 注释解释“为什么”，不要解释显而易见的“是什么”。
- 测试偏好 TDD，关注行为测试。

## 项目定位

- 项目名：月半弯 / Half Moon。
- 类型：移动端优先 PWA 女性生理期记录应用。
- 第一版范围：本地可交互版，不做账号、云同步、推送通知或医疗建议。
- 数据保存：浏览器 `localStorage`。
- 目标设计来源：Figma Make 文件“女性生理期记录app”。
  - 地址：`https://www.figma.com/make/WvtlgtAJ6Z4IcV2Eoo8fDI/女性生理期记录app?p=f`
  - Figma Make 工具通常只返回源码资源清单；需要时可通过 Chrome 打开 Figma Make，切到 `Code` 模式读取真实代码/预览。

## 技术栈

- React 19 + Vite 6 + TypeScript。
- Tailwind CSS 3。
- PWA：`vite-plugin-pwa`。
- 测试：Vitest + Testing Library。
- 图标：`lucide-react`。
- 本地组件采用 shadcn 风格，但当前没有完整 shadcn CLI 生成组件库。

## 常用命令

```bash
npm install
npm run web
npm test
npm run build
npm run lint
```

- 当前开发服务曾使用：`http://localhost:5174/`，因为 `5173` 可能被占用。
- `npm test` 当前覆盖 6 个测试。
- `npm run build` 当前可通过，会生成 `dist/`。

## 关键文件

- `src/app/App.tsx`：应用壳、tab 状态、本地 service 注入、底部导航。
- `src/app/components/HomeTab.tsx`：首页、日历、点击日期记录、记录弹窗。
- `src/app/components/InsightsTab.tsx`：分析页。
- `src/app/components/ProfileTab.tsx`：我的页，头像/名字/身体数据档案/清除缓存。
- `src/app/components/BottomNav.tsx`：底部导航，文案为“今天 / 分析 / 我的”。
- `src/app/services/cycle.ts`：周期计算、repository、service。
- `src/app/models/cycle.ts`：周期记录与 summary 类型。
- `src/styles/globals.css`：全局样式和主题变量。
- `vite.config.ts`：Vite + PWA 配置。
- `vitest.config.ts`：测试配置，避免和 Vite 构建配置类型冲突。

## 视觉与交互记忆

- 整体风格接近 Figma 当前版本：iOS 风格、浅灰背景 `#F5F5F7`、白色大圆角卡片、克制粉色 `#DFA4A9` / `#F6D9DC`。
- App 外框：移动端最大宽度约 `430px`；桌面预览带大圆角和柔和阴影。
- 首页结构：
  - 顶部标题：“卵泡期，第12天”。
  - 副标题：“小仙女， 上午好 · 星期二”。
  - “今日身体提示”白色卡片。
  - “2026年 5月”日历卡片。
  - 不要恢复独立“记录经期”按钮；记录入口是点击日历日期。
- 日历：
  - 日期背景必须是圆形，不要胶囊形。
  - 外层日期格子可以固定高度，背景应放在内部 `h-12 w-12 rounded-full` 圆形元素上。
  - 记录图标显示在日期圆形下方：💧❤️😊。
  - 图例包含：经期、今天、预测经期、已记录。
- 我的页：
  - 显示圆形渐变头像、名字“小仙女”。
  - 身体数据档案：年龄、身高、体重、平均周期长度、经期天数。
  - 最后有清除缓存入口和版本号。

## 数据边界

- UI 不直接操作业务计算；通过 `createPeriodService` 获取/写入记录。
- 当前 repository 使用以下 key：
  - `half-moon.period-records`
  - `half-moon.cycle-settings`
- 主要类型：
  - `PeriodRecord`
  - `PeriodRecordInput`
  - `UserCycleSettings`
  - `CycleSummary`
- `LocalPeriodRepository` 读写需要 try-catch；异常日志走 `logDebugError`。

## 已知决策与坑

- 不要把 `vite.config.ts` 从 `vitest/config` 导入 `defineConfig`；会导致 Vite 和 Vitest 嵌套依赖类型冲突。测试配置已经拆到 `vitest.config.ts`。
- 不要再按 Figma Make 的资源清单臆测 UI；如需对齐 Figma，优先从 Chrome 中打开 Figma Make 的 Code/Preview 读取实际源码或截图。
- `dist/` 是构建产物，不要手改。
- 项目目录当前不是 git 仓库；不要依赖 git 状态判断变更。

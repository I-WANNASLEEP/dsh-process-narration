# 发布为 DSH 市场插件

两条路，互相不排斥：**A 自建索引**（自己控制，别人加个 URL 就能装）、**B 提 PR 进社区大目录**（进 awesome-dsh-plugin → 被转进 DSH 默认市场源）。

---

## 0. 先决条件（两条路都要）

1. **推成公开 GitHub 仓库**，包目录放在仓库根（或子目录，见路线 B 的 monorepo 说明）。
2. **用发布版 manifest 覆盖**：把 `publish/package.publish.json` 的内容替换 `package.json`，然后把其中的 `I-WANNASLEEP` 换成真实 GitHub 用户名。
   关键差异：删掉 `"private": true`，补 `repository` / `homepage` / `bugs` / `license` / `keywords`。
3. **确认 `dsh.bundle` manifest 在**——社区目录明确写：只声明 `dsh.client` 的仓库不可安装。我们这个包已经有：
   ```json
   "dsh": { "bundle": { "patch": "./cordis.patch.yml" } }
   ```
   且仓库根的 `cordis.patch.yml` 存在。
4. **图标**：仓库根放 `icon.svg`（本目录已备）。提 awesome PR 时官方更希望是 GitHub 托管的**位图**（如 `icon-180.png`），SVG 会回退成作者头像。
5. 给仓库加 GitHub topic：`dsh-plugin`。

---

## A. 自建索引（30 分钟内可用）

DSH 的市场源是**可配置的 URL 列表**（`@deepseek-ai/dsh-plugin-market` 的 `indexes`，默认空数组），所以你不必等任何人的目录收录。

### A1. 生成索引

```sh
cd dsh-process-narration
git init && git add -A && git commit -m "feat: process narration"
node publish/make-index.mjs --repo https://github.com/I-WANNASLEEP/dsh-process-narration
```

脚本会读 `package.json`、取 `git rev-parse HEAD`、写 `publish/dsh-index.json`，并用 DSH 自带的
`@deepseek-ai/dsh-plugin-market-index` 校验后打印安装 spec。

### A2. 托管

和主流市场一样的做法：把索引推到仓库的 `dist` 分支，走 jsDelivr 的 `@dist` 通道：

```sh
git checkout --orphan dist
git add publish/dsh-index.json
git commit -m "dist: index"
git push origin dist
```

得到 URL：`https://cdn.jsdelivr.net/gh/I-WANNASLEEP/dsh-process-narration@dist/publish/dsh-index.json`
（嫌路径深就把 `dsh-index.json` 放 dist 分支根，URL 更短。）

### A3. 别人怎么装

设置 → 插件市场 → 索引源，加上那个 URL；在发现页搜「过程人话」或 `narration`，点安装。
等价的手动命令：

```sh
dsh plugin --profile web add "git+https://github.com/I-WANNASLEEP/dsh-process-narration.git#<40位commit>"
```

---

## B. 进社区大目录

DSH 默认市场源（`realguan/dsh-plugin-market` 的 `dsh-index.json`）是从
`https://awesome-dsh-plugin.com/plugins.json` 转换生成的，而那份目录**只收 PR**：

新增一个文件 `data/plugins/I-WANNASLEEP__dsh-process-narration.yml`（内容即本目录的 `awsome-entry.yml`，注意改文件名与 `I-WANNASLEEP`）：

```yaml
url: https://github.com/I-WANNASLEEP/dsh-process-narration
name: I-WANNASLEEP/dsh-process-narration
category: ui
description:
  en: Adds a system-prompt section that makes the agent state what each step does in plain words before it runs tools.
  zh: '往系统提示里加一段规则：动手前先用一句人话说清这一步要做什么，过程不再只是一串命令行。'
icon: https://raw.githubusercontent.com/I-WANNASLEEP/dsh-process-narration/main/icon-180.png
```

评审门槛（官方原文要点）：

| 要求 | 我们的状态 |
|---|---|
| `package.json` 声明 `dsh.bundle` | ✅ 已有 |
| 仓库根有配套 `cordis.patch.yml` | ✅ 已有 |
| 真实可用代码，非占位/纯 README | ✅ |
| 仓库创建满 1 天（CI 自动查） | 需等一天 |
| 加 `dsh-plugin` topic | 需手动加 |
| 描述只讲功能、可被代码核对 | ✅ 文案已按此写 |
| `category` 贴合实际 | `ui`（改变过程展示体验） |

合并后 README 由脚本重新生成，**不要手改 README**；条目文件永不冲突，所以 PR 很干净。

---

## 维护：每次发版

索引里的 Git 源固定到 commit，所以**改了代码必须重跑**：

```sh
# 1) 改 package.json 的 version，提交
# 2) 重新生成索引（换新 commit + 新时间戳）
node publish/make-index.mjs --repo https://github.com/I-WANNASLEEP/dsh-process-narration
# 3) 推到 dist 分支
```

改完不重跑，市场里别人装到的还是旧 commit。

---

## 一条容易踩的坑：双入口

当前本机是**手动**装的：profile 根 `cordis.patch.yml` 里有一行
`- insert: [{ id: process-narration, name: dsh-process-narration }]`。
从市场安装时，DSH 走 `pluginManager.installBundle`，会应用**包自带的** `cordis.patch.yml`（同一个 id `process-narration`）。

这不是猜测，补丁引擎（`dsh-app-boot/lib/index.js` 的 `applyEntryPatches`）对**顶层** insert 只做
`data.push(...insert)`，**没有按 id 去重**；插进去之后才用 `buildMap(insert)` 建索引给后续 patch 定位。
所以 bundle 层插一次、profile 根 patch 再插一次，entry 列表里就是两条同 id 条目 → 两个 fiber 都会挂载 →
第二个注册 `style:process-narration` 时撞上 `NamedEntries` 的重名检查，抛
`prompt section "style:process-narration" is already registered`。

所以：**从市场装之前，先删掉 profile 根 patch 里的 `process-narration` / `human-steps` 那两行**
（`~/.dsh/profiles/desktop/cordis.patch.yml` 末尾那个 insert 块），只留市场这一条入口。

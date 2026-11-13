# dsh-process-narration（过程人话）

把 DSH 对话里的「过程」从命令行流水改成人话说明。做法不是改界面，而是在系统提示里固定一段规则，让模型：

1. 每进入一个工作阶段先写一句人话（「先量一下这三段素材的时长」）；
2. 每个工具的 `description` 写成中文人话，不复述命令与 flag；
3. 旁白只是过程说明，最终回答仍然第一句给交付物。

配合「设置 → 通用 → 工作详情 = 紧凑」，完成后的历史过程会折叠成一行，展开才看到工具卡片——观感接近 Codex。

## 从市场安装（给其他人）

索引源（设置 → 插件市场 → 索引源，添加一行）：

```
https://cdn.jsdelivr.net/gh/I-WANNASLEEP/dsh-process-narration@dist/dsh-index.json
```

加完在发现页搜「过程人话」或 `narration`，点安装。等价的手动命令（commit 钉在索引里）：

```sh
dsh plugin --profile web add "git+https://github.com/I-WANNASLEEP/dsh-process-narration.git#<40位commit>"
```

> 只保留一条入口：若 profile 根 `cordis.patch.yml` 里已经手写了 `process-narration` 的 insert 行，
> 从市场装之前先删掉它——补丁引擎对顶层 insert 只做 `push` 不按 id 去重，同一个 id 插两次会让
> `style:process-narration` 撞上重名检查。

## 本机手动安装位置

- 源码：本目录（`~/Documents/deepseek-harness/default-workspace/dsh-process-narration`）
- profile 链接：`~/.dsh/profiles/desktop/node_modules/dsh-process-narration` → 本目录
- 装配：`~/.dsh/profiles/desktop/cordis.patch.yml` 增加一行
  `- { id: process-narration, name: dsh-process-narration }`

## 配置

在 cordis.patch.yml 里给这一行加 `config`：

```yaml
- id: process-narration
  name: dsh-process-narration
  config:
    enabled: true      # false 等于临时关掉
    order: 9400        # 系统提示里的插入序，越大越靠后
    text: |
      覆盖默认规则的自定义正文……
```

## 英文版规则

```text
## Process narration

Before a tool stage, write one plain sentence saying what you are about to do and what you expect to learn or change. One sentence, ~20 words, no flags, no command text.
Narrate stages, not calls.
Every tool call that accepts a description states the intent in human terms.
Narration is commentary, not a preamble: the final answer still opens with the deliverable.
```

## 说明

- 零依赖、零 import，只注册一个 `style:process-narration` prompt section。
- 改完源码需要重启 DSH（⌘Q 后再打开）才会重新加载提示层。

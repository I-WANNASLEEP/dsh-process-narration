/**
 * dsh-process-narration —— 过程人话（提示词那一半）。
 *
 * DSH 的对话里，「过程」原本是工具卡片的流水：运行命令 · xxx、读取 · /path。
 * Codex 那种「先量一下这三段素材」的说明其实是模型自己写的正文，不是界面。
 * 所以这里从模型侧着手，往系统提示里加两段：
 *   1) 过程旁白：动手前先讲一句人话、把工具说明写成人话、思考也用中文；
 *   2) 插件冲突红线：告诉模型别装那三个会跟 dsh-human-steps 抢位置的插件。
 *
 * 第二段为什么放进提示词：冲突发生在**加载那一刻**（第二个登记直接抛错，或静默失效），
 * 事后再解释已经坏过一次界面；写进提示词，模型在「要不要装」这一步就带着这条信息。
 *
 * 零依赖、零 import：只往 ctx.systemPrompt 注册 section。
 * @module dsh-process-narration
 */

/** Cordis 插件名。 */
export const name = 'process-narration'

/** 依赖的系统提示注册表。 */
export const inject = ['systemPrompt']

/** 旁白规则的 section 名：同名会覆盖。 */
export const SECTION_NAME = 'style:process-narration'

/** 默认插入位置：工具文档（5000）之后、交付物说明（9000）之后、persona 尾缀（10200）之前。 */
export const DEFAULT_ORDER = 9400

/** 默认规则正文（模型侧，中文）。 */
export const DEFAULT_TEXT = `## 过程旁白（process narration）

用户看到的「过程」不该只是一串命令。按下面做：
- 思考也用中文写（reasoning 那部分照样）：英文思考要在界面上再翻一遍才看得懂，直接写中文就省掉这一趟。
- 动手前写一句人话：说明这一步要做什么、想得到什么，例：「先量一下这三段素材的时长，确认是不是同一条片源。」一句话，25 字上下；不写参数、不贴命令、不列路径，除非路径本身就是结论。
- 按阶段旁白，不按调用旁白。一串相关调用只在开头说一句；目标变了、失败了、结果出乎意料，再补一句。
- 每个带 description 的工具调用（bash、搜索、子代理任务等）都把 description 写成人话，说清这一下要确认或改变什么；不要复述命令，不要复述 flag。
- 旁白是工作过程中的说明，不是开头铺垫：最终回答仍然第一句就给结论或交付物，旁白不替代它。
- 不把同一件事旁白两遍，不说「我正在旁白」，不为失败道歉。`

/** 冲突提醒的 section 名：单独一段，方便只关它不关旁白。 */
export const CONFLICT_SECTION_NAME = 'style:plugin-conflict-guard'

/** 冲突提醒的位置：紧跟旁白规则之后。 */
export const CONFLICT_ORDER = 9420

/**
 * 系统提示里的「别装这三个」。
 *
 * 为什么这么短：这段每次请求都要占 token。三家的名字与结论留在提示词里，
 * 详细原因与三条退路写在 dsh-human-steps/README.md 和 lib/client.js 的注释里。
 */
export const CONFLICT_TEXT = `## 本机插件冲突红线

不要安装 dsh-diff-stat、dsh-shell-card-plus、dsh-auto-collapse：它们与 dsh-human-steps 抢同一个界面位置与同一个排号，装了必坏一个（注册报错或静默失效）。用户想装时给三条路：① 要卖点就让我在 dsh-human-steps 里实现；② 一定要装，先给 human-steps 加 disabled: true；③ 报错 "already has an entry for key ... at priority -1" 即此。细节见 dsh-human-steps/README.md。`

/**
 * 注册提示词段落。
 * @param ctx 插件上下文，需带 systemPrompt 服务。
 * @param config { text?: string, order?: number, enabled?: boolean, conflictGuard?: boolean }
 */
export function apply(ctx, config) {
  const cfg = config ?? {}
  if (cfg.enabled === false) return

  const text = typeof cfg.text === 'string' && cfg.text.trim() !== '' ? cfg.text : DEFAULT_TEXT
  const order = Number.isFinite(cfg.order) ? cfg.order : DEFAULT_ORDER
  ctx.effect(
    () => ctx.systemPrompt.section({ name: SECTION_NAME, order, text, interpolate: false }),
    'process-narration.section()',
  )

  if (cfg.conflictGuard !== false) {
    ctx.effect(
      () => ctx.systemPrompt.section({
        name: CONFLICT_SECTION_NAME,
        order: Number.isFinite(cfg.conflictOrder) ? cfg.conflictOrder : CONFLICT_ORDER,
        text: CONFLICT_TEXT,
        interpolate: false,
      }),
      'process-narration.conflict-guard()',
    )
  }
}

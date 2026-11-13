/**
 * dsh-process-narration —— 过程人话。
 *
 * DSH 的对话里，「过程」是工具卡片的流水：运行命令 · xxx、读取 · /path。
 * Codex 那种「先量一下这三段素材」的说明其实是模型自己写的正文，不是界面。
 * 所以这里从模型侧装着：往系统提示里加一段固定规则，要求
 *   1) 每进入一个工作阶段，先用一句人话讲清要干什么；
 *   2) 每个带 description 的工具调用都把 description 写成中文人话；
 *   3) 旁白只是过程说明，不顶替最终回答的第一句交付物。
 *
 * 插件零依赖、零 import：只往 ctx.systemPrompt 注册一个 section，
 * 靠 order 排在工具文档之后、交付物说明与 persona 尾缀之前。
 * @module dsh-process-narration
 */

/** Cordis 插件名。 */
export const name = 'process-narration'

/** 依赖的系统提示注册表。 */
export const inject = ['systemPrompt']

/** section 名：同名会覆盖，配置面板里也按它定位。 */
export const SECTION_NAME = 'style:process-narration'

/** 默认插入位置：工具文档（5000）之后、交付物说明（9000）之后、persona 尾缀（10200）之前。 */
export const DEFAULT_ORDER = 9400

/** 默认规则正文（模型侧，中文）。 */
export const DEFAULT_TEXT = `## 过程旁白（process narration）

用户看到的「过程」不该只是一串命令。按下面做：
- 动手前写一句人话：说明这一步要做什么、想得到什么，例：「先量一下这三段素材的时长，确认是不是同一条片源。」一句话，25 字上下；不写参数、不贴命令、不列路径，除非路径本身就是结论。
- 按阶段旁白，不按调用旁白。一串相关调用只在开头说一句；目标变了、失败了、结果出乎意料，再补一句。
- 每个带 description 的工具调用（bash、搜索、子代理任务等）都把 description 写成人话，说清这一下要确认或改变什么；不要复述命令，不要复述 flag。
- 旁白是工作过程中的说明，不是开头铺垫：最终回答仍然第一句就给结论或交付物，旁白不替代它。
- 不把同一件事旁白两遍，不说「我正在旁白」，不为失败道歉。`

/**
 * 注册（或按配置覆盖）过程旁白规则。
 * @param ctx 插件上下文，需带 systemPrompt 服务。
 * @param config { text?: string, order?: number, enabled?: boolean }
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
}

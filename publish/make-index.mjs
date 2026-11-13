#!/usr/bin/env node
/**
 * 生成 DSH 插件市场索引（format 1）并自校验。
 *
 * 用法：
 *   node publish/make-index.mjs --repo https://github.com/I-WANNASLEEP/dsh-process-narration
 *   node publish/make-index.mjs --repo ... --out publish/dsh-index.json
 *   node publish/make-index.mjs --repo ... --npm            # 已发布到 npm 时用 npm source
 *   node publish/make-index.mjs --repo ... --commit <sha>   # 不在 git 工作树里时手工指定
 *
 * 会做三件事：
 *   1) 读 ../package.json 拿 name / version / description
 *   2) 取当前 git HEAD 作为固定 commit（市场安装靠它锁版本）
 *   3) 用 DSH 自带的 @deepseek-ai/dsh-plugin-market-index 校验，并打印安装 spec
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const pkgRoot = resolve(here, '..')

const argv = process.argv.slice(2)
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback
}
const flag = (name) => argv.includes(`--${name}`)

const pkg = JSON.parse(readFileSync(resolve(pkgRoot, 'package.json'), 'utf8'))
const repo = arg('repo')
if (!repo) {
  console.error('缺少 --repo https://github.com/<owner>/<repo>')
  process.exit(1)
}
const cleanRepo = repo.replace(/\.git$/, '')

let commit = arg('commit')
if (!commit && !flag('npm')) {
  try {
    commit = execFileSync('git', ['-C', pkgRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  } catch {
    console.error('当前目录不是 git 仓库，无法取 commit。先 git init 并提交，或用 --commit <40位sha> 指定。')
    process.exit(1)
  }
  if (!/^[0-9a-f]{40}$/.test(commit)) {
    console.error(`commit 不是小写 40 位 hex：${commit}`)
    process.exit(1)
  }
}

const nowSeconds = Math.floor(Date.now() / 1000)
const useNpm = flag('npm')
const engineRange = arg('engine')   // 不传则不写 engines.dsh：任何 DSH 版本都显示兼容

const source = useNpm ? { type: 'npm' } : { type: 'git', url: cleanRepo, commit }

const index = {
  format: 1,
  title: { en: 'Little Code Sauce Plugins', zh: '小代码酱插件源' },
  description: {
    en: 'Personal DSH plugin index by congwei.',
    zh: 'congwei 的个人 DSH 插件索引。',
  },
  metadata: {
    categories: {
      ui: { title: { en: 'UI Enhancements', zh: '界面与展示' } },
      tools: { title: { en: 'Tools & Capabilities', zh: '工具与能力' } },
    },
    labels: {
      prompt: { title: { en: 'Touches the system prompt', zh: '改动系统提示词' } },
    },
    sortKeys: {
      added: { title: { en: 'Recently added', zh: '最近收录' }, order: 'desc' },
    },
  },
  plugins: [
    {
      name: pkg.name,
      title: 'Process Narration',
      description: {
        en: 'Adds a system-prompt section that makes the agent state what each step does in plain words before it runs tools.',
        zh: '往系统提示里加一段规则：动手前先用一句人话说清这一步要做什么，过程不再只是一串命令行。',
      },
      icon: `${cleanRepo.replace('github.com', 'raw.githubusercontent.com')}/main/icon.svg`,
      author: arg('author', 'congwei'),
      homepage: cleanRepo,
      repository: { url: cleanRepo },
      metadata: {
        category: arg('category', 'ui'),
        keywords: ['dsh', 'dsh-plugin', 'deepseek-harness', 'narration', 'process', 'prompt', 'system-prompt'],
        labels: ['prompt'],
        sortKeys: { added: nowSeconds },
      },
      versions: [
        {
          version: pkg.version,
          publishTimestamp: nowSeconds,
          source,
          ...(engineRange ? { engines: { dsh: engineRange } } : {}),
        },
      ],
    },
  ],
}

const outPath = resolve(here, arg('out', 'dsh-index.json'))
writeFileSync(outPath, JSON.stringify(index, null, 1) + '\n')

// —— 用 DSH 自带校验器再验一遍 ——
const appDir = process.env.DSH_APP_DIR
  || '/Applications/DSH NEXT.app/Contents/Resources/app'
const validatorEntry = `${appDir}/node_modules/@deepseek-ai/dsh-plugin-market-index/lib/index.js`
const indexUrl = arg('index-url', `https://cdn.jsdelivr.net/gh/I-WANNASLEEP/REPO@dist/dsh-index.json`)

try {
  const { parseMarketIndex, marketInstallTarget } =
    await import(`file://${validatorEntry}`)
  const parsed = parseMarketIndex(JSON.parse(readFileSync(outPath, 'utf8')), indexUrl)
  const plugin = parsed.plugins[0]
  console.log(`校验通过：${parsed.plugins.length} 个插件`)
  console.log(`安装 spec：${marketInstallTarget(plugin.name, plugin.versions[0]).spec}`)
} catch (error) {
  console.error('校验失败：', error?.message ?? error)
  console.error('（索引已写出，但市场读它时会拒绝）')
  process.exitCode = 1
}

console.log(`已写出：${outPath}`)

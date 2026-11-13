Adds one entry: `I-WANNASLEEP/dsh-process-narration` (`category: ui`).

**What it does.** Registers two sections in the DSH system prompt:

1. **Process narration** (`style:process-narration`, order 9400) — the agent states what each step is for in one plain sentence before running tools, writes tool `description` fields in human terms, and narrates by stage rather than per call.
2. **Plugin conflict guard** (`style:plugin-conflict-guard`, order 9420) — tells the model that `dsh-diff-stat`, `dsh-shell-card-plus` and `dsh-auto-collapse` collide with `dsh-human-steps` on the same priority `-1` slot, so installing both breaks one of them (registration error, or silent no-op). The conflict happens at load time, which is why the warning belongs in the prompt rather than in a README.

**Manifest and layout.** The repo root declares `dsh.bundle` → `./cordis.patch.yml` and ships the matching patch file, so `dsh plugin add` works directly:

```json
"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }
```

**Footprint.** Zero runtime dependencies, no imports, no filesystem or network access — it only calls `ctx.systemPrompt.section()`. Each section can be disabled separately (`enabled: false` for both, `conflictGuard: false` for the guard alone) and the narration text can be replaced wholesale via `config.text`.

**Verified against.** DSH 0.2.1-rc.2 (DSH NEXT 2.0.19-next): both sections appear in the assembled system prompt after a restart, and the guard text is unchanged by the section interpolation.

Release: https://github.com/I-WANNASLEEP/dsh-process-narration/releases/tag/v0.1.1
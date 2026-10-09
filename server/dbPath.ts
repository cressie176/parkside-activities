import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Resolve relative to the repo root, not the process cwd.
const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

// DB_PATH overrides the default; a relative value is resolved from the repo root.
export const dbPath = path.resolve(repoRoot, process.env.DB_PATH || 'parkside.db')

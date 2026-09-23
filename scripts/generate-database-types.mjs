import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const projectRef = process.env.SUPABASE_PROJECT_REF
if (!projectRef)
  throw new Error('Set SUPABASE_PROJECT_REF before generating database types.')

const output = execFileSync(
  'npx',
  [
    'supabase',
    'gen',
    'types',
    'typescript',
    '--project-id',
    projectRef,
    '--schema',
    'public',
  ],
  { stdio: ['ignore', 'pipe', 'inherit'] },
)

writeFileSync('src/types/database.generated.ts', output)

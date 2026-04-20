/**
 * Regenerate release/latest.yml and the .exe.blockmap for the Windows NSIS installer
 * after the setup EXE has changed (e.g. post-sign). Uses the same app-builder
 * blockmap step as electron-builder.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname, basename } from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'
import { dump } from 'js-yaml'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const version = pkg.version
const artifactName = `SiteWeave-Setup-${version}.exe`
const exePath = join(root, 'release', artifactName)
const blockmapPath = `${exePath}.blockmap`

if (!existsSync(exePath)) {
  console.error(`Missing installer: ${exePath}`)
  process.exit(1)
}

const appBuilder = join(root, 'node_modules', 'app-builder-bin', 'win', 'x64', 'app-builder.exe')
if (!existsSync(appBuilder)) {
  console.error(`Missing app-builder: ${appBuilder} (run npm ci)`)
  process.exit(1)
}

const r = spawnSync(appBuilder, ['blockmap', '--input', exePath, '--output', blockmapPath], {
  encoding: 'utf8',
  cwd: root,
  maxBuffer: 32 * 1024 * 1024,
})

if (r.status !== 0) {
  console.error(r.stderr || r.stdout || `app-builder exited ${r.status}`)
  process.exit(r.status ?? 1)
}

const out = (r.stdout || '').trim()
const jsonLine = out
  .split(/\r?\n/)
  .map((l) => l.trim())
  .find((l) => l.startsWith('{') && l.endsWith('}'))
if (!jsonLine) {
  console.error('Could not parse app-builder blockmap JSON from stdout:', out)
  process.exit(1)
}

const { size, sha512 } = JSON.parse(jsonLine)
if (typeof size !== 'number' || typeof sha512 !== 'string') {
  console.error('Unexpected blockmap JSON:', jsonLine)
  process.exit(1)
}

const doc = {
  version,
  files: [{ url: artifactName, sha512, size }],
  path: artifactName,
  sha512,
  releaseDate: new Date().toISOString(),
}

writeFileSync(join(root, 'release', 'latest.yml'), dump(doc, { lineWidth: 8000, noRefs: true }), 'utf8')
console.log(`Wrote release/latest.yml`)
console.log(`Wrote ${join('release', basename(blockmapPath))}`)

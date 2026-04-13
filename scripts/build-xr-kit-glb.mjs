/**
 * Builds self-contained .glb files for public/assets/models/xr-kit/
 * from Modular SciFi MegaKit glTF + shared Textures (see docs/xr-scene-enhancement-plan.md Task 0).
 */
import { execFileSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
} from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const mega = join(root, 'public/assets/models/Modular SciFi MegaKit[Standard]')
const texturesDir = join(mega, 'Textures')
const outDir = join(root, 'public/assets/models/xr-kit')
const tmpDir = join(outDir, '_gltf_build_tmp')

/** @type {readonly [string, string, string][]} */
const models = [
  ['glTF/Platforms', 'Platform_Round1.gltf', 'platform_round.glb'],
  ['glTF/Platforms', 'Platform_Simple.gltf', 'platform_simple.glb'],
  ['glTF/Columns', 'Column_Astra.gltf', 'column_astra.glb'],
  ['glTF/Columns', 'Column_Hollow.gltf', 'column_hollow.glb'],
  ['glTF/Props', 'Prop_Computer.gltf', 'prop_computer.glb'],
  ['glTF/Props', 'Prop_Rail_4.gltf', 'prop_rail.glb'],
  ['glTF/Walls', 'TopPlastic_Straight.gltf', 'wall_top_straight.glb'],
  ['glTF/Walls', 'BottomSimple_Straight.gltf', 'wall_bottom_straight.glb'],
]

function main() {
  if (!existsSync(mega)) {
    console.error('Missing MegaKit folder:', mega)
    process.exit(1)
  }
  mkdirSync(outDir, { recursive: true })

  const gltfTransform = join(
    root,
    'node_modules',
    '@gltf-transform',
    'cli',
    'bin',
    'cli.js',
  )
  if (!existsSync(gltfTransform)) {
    console.error('Run npm install (missing @gltf-transform/cli)')
    process.exit(1)
  }

  const textureFiles = readdirSync(texturesDir).filter((f) =>
    f.toLowerCase().endsWith('.png'),
  )

  for (const [sub, gltfName, outName] of models) {
    rmSync(tmpDir, { recursive: true, force: true })
    mkdirSync(tmpDir, { recursive: true })

    const srcDir = join(mega, sub)
    const gltfPath = join(srcDir, gltfName)
    const binName = gltfName.replace(/\.gltf$/i, '.bin')
    const binPath = join(srcDir, binName)

    if (!existsSync(gltfPath)) {
      console.error('Missing:', gltfPath)
      process.exit(1)
    }
    copyFileSync(gltfPath, join(tmpDir, gltfName))
    if (existsSync(binPath)) {
      copyFileSync(binPath, join(tmpDir, binName))
    }
    for (const f of textureFiles) {
      copyFileSync(join(texturesDir, f), join(tmpDir, f))
    }

    const outPath = join(outDir, outName)
    execFileSync(process.execPath, [gltfTransform, 'copy', gltfName, outPath], {
      cwd: tmpDir,
      stdio: 'inherit',
    })
    console.log('Wrote', outPath)
  }

  rmSync(tmpDir, { recursive: true, force: true })

  const moltenSrc = join(
    root,
    'public/assets/models/Molten Maps SciFi Asset Pack/Assets/gtlf/Briefing_Screen_Blue.glb',
  )
  const moltenDst = join(outDir, 'briefing_screen.glb')
  if (existsSync(moltenSrc)) {
    copyFileSync(moltenSrc, moltenDst)
    console.log('Copied', moltenDst)
  } else {
    console.warn('Optional Molten asset missing:', moltenSrc)
  }

  execFileSync(process.execPath, [gltfTransform, 'inspect', join(outDir, 'platform_round.glb')], {
    cwd: root,
    stdio: 'inherit',
  })
}

main()

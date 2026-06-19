import { SceneRenderer, type Scene } from '../../components/SceneRenderer/SceneRenderer'
import { cn } from '../../lib/cn'

// Bundle every exported Section 3 asset; resolve scene `src` filenames to URLs.
const assetUrls = import.meta.glob('../../assets/section3/img/*', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const byName: Record<string, string> = {}
for (const [path, url] of Object.entries(assetUrls)) {
  byName[path.split('/').pop()!] = url
}

// One scene per theme variant (Section 3 has 8 distinct palettes → theme1–8),
// keyed by file stem so the screen swaps the whole composition on theme switch.
const sceneModules = import.meta.glob('./scenes/*.json', { eager: true }) as Record<
  string,
  { default: Scene }
>
const sceneByTheme: Record<string, Scene> = {}
for (const [path, mod] of Object.entries(sceneModules)) {
  sceneByTheme[path.split('/').pop()!.replace('.json', '')] = mod.default
}

const DEFAULT_THEME = 'theme1'

/**
 * 点击领取 (claim-reward), Section 3. Eight theme variants reconstructed 1:1
 * from the plugin export; `themeId` selects the variant's scene. Presentational.
 */
export function Section3({
  className,
  themeId = DEFAULT_THEME,
}: {
  className?: string
  themeId?: string
}) {
  const scene = sceneByTheme[themeId] ?? sceneByTheme[DEFAULT_THEME]
  return (
    <SceneRenderer
      scene={scene}
      assetUrl={(src) => byName[src]}
      className={cn('bg-white', className)}
    />
  )
}

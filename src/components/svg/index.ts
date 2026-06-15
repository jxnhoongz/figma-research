// Ergonomic re-exports of the auto-generated section2 SVG components, keyed by
// the semantics the kit cares about. Regenerate the underlying files with
// `node scripts/gen-svg-components.mjs`.

import { Passed } from './generated/status-icon/Passed'
import { Locked } from './generated/status-icon/Locked'
import { Fail } from './generated/status-icon/Fail'
import { Current } from './generated/status-icon/Current'

import { PassedLeft } from './generated/component-38/PassedLeft'
import { PassedRight } from './generated/component-38/PassedRight'
import { LockedLeft } from './generated/component-38/LockedLeft'
import { LockedRight } from './generated/component-38/LockedRight'
import { CurrentLeft } from './generated/component-38/CurrentLeft'
import { CurrentRight } from './generated/component-38/CurrentRight'

import { Today } from './generated/tab-switch/Today'
import { Yesterday } from './generated/tab-switch/Yesterday'

import { Start } from './generated/map-pattern/Start'
import { MidRightToLeft } from './generated/map-pattern/MidRightToLeft'
import { MidLeftToRight } from './generated/map-pattern/MidLeftToRight'
import { AllPieces } from './generated/map-pattern/AllPieces'

/** Status -> status-icon glyph. `active` maps to the gold "current" star. */
export const STATUS_ICON = {
  done: Passed,
  locked: Locked,
  fail: Fail,
  active: Current,
} as const

/** (statusKey, side) -> Component 38 card chrome. */
export const STEP_CARD = {
  passed: { left: PassedLeft, right: PassedRight },
  locked: { left: LockedLeft, right: LockedRight },
  current: { left: CurrentLeft, right: CurrentRight },
} as const

export const TAB_ICON = { today: Today, yesterday: Yesterday } as const

// Serpentine map lanes. The Figma path (Background Content, 1:1048) stacks 8
// tiles: Start, then alternating Mid-right-to-left / Mid-left-to-right, capped
// by an End lane. Only `start` + `midRightToLeft` were exported; `midLeftToRight`
// is a mirror-approximation of `midRightToLeft`. For the actual screen we render
// the real `all` composite (all-pieces.svg = the full 4-step serpentine,
// start+mid+mid+2 ends), which is the most faithful single asset.
export const MAP_PATTERN = {
  start: Start,
  midRightToLeft: MidRightToLeft,
  midLeftToRight: MidLeftToRight,
  all: AllPieces,
} as const

export {
  Passed,
  Locked,
  Fail,
  Current,
  PassedLeft,
  PassedRight,
  LockedLeft,
  LockedRight,
  CurrentLeft,
  CurrentRight,
  Today,
  Yesterday,
  Start,
  MidRightToLeft,
  MidLeftToRight,
  AllPieces,
}

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

export const MAP_PATTERN = { start: Start, midRightToLeft: MidRightToLeft, all: AllPieces } as const

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
  AllPieces,
}

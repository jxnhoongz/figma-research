// Hand-assembled serpentine from the REAL section2 map-pattern pieces.
//
// Source of truth: src/assets/figma-plugin/structure/Section_2_1-108.json,
// frame "Background Content" (306×548). It stacks 8 "Map pattern-bg" instances
// at a 70px vertical pitch (y = 0,70,140,...,490), each 299px wide, in this
// exact variant order:
//   1 Start              (1:6035)
//   2 Mid-right to left   (1:6038)
//   3 Mid-left to right   (1:6041)
//   4 Mid-right to left   (1:6038)
//   5 Mid-left to right   (1:6041)
//   6 Mid-right to left   (1:6038)
//   7 Mid-left to right   (1:6041)
//   8 End-left to right   (1:6044)  — bottom cap
// Total height 7*70 + 58 ≈ 548 → viewBox 0 0 299 548.
//
// Each piece is themeable (accent #9A41FE → currentColor) and rendered as a
// nested <svg> at its real y offset. Replaces the old AllPieces composite +
// the mirror-faked MidLeftToRight.
import type { SVGProps } from 'react'
import { Start } from './Start'
import { MidRightToLeft } from './MidRightToLeft'
import { MidLeftToRight } from './MidLeftToRight'
import { EndLeftToRight } from './EndLeftToRight'

// (Component, y-offset) in the real serpentine order from the structure JSON.
const TILES = [
  { Tile: Start, y: 0 },
  { Tile: MidRightToLeft, y: 70 },
  { Tile: MidLeftToRight, y: 140 },
  { Tile: MidRightToLeft, y: 210 },
  { Tile: MidLeftToRight, y: 280 },
  { Tile: MidRightToLeft, y: 350 },
  { Tile: MidLeftToRight, y: 420 },
  { Tile: EndLeftToRight, y: 490 },
] as const

export function MapPath(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 299 548" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      {TILES.map(({ Tile, y }, i) => (
        <Tile key={i} x={0} y={y} width={299} height={70} />
      ))}
    </svg>
  )
}

import { cn } from '../../lib/cn'
import star from '../../assets/section2/decor/section-star.svg'
import underline from '../../assets/section2/decor/section-underline.svg'

/**
 * Shared section header mirroring Figma "Frame 1410107569" (闯关排列, node 1:985)
 * and the identical "Frame 1410107939" (活动详情). Both are the SAME 100×35 layout,
 * rendered by THIS one component → guaranteed identical:
 *
 *   - Star 25 (30×31 VECTOR, node 1:987) — the REAL exported asset: rounded
 *     5-point star, orange gradient (#FFB200→#FF6100) + inner shadow + white
 *     stroke. Sits at the left, overlapping the start of the title text.
 *   - Title TEXT (22px, YouSheBiaoTiHei display face, #222222).
 *   - Vector 2723 (69×12 VECTOR, node 1:986) — the REAL exported asset: a wavy
 *     ribbon/squiggle underline, green→yellow gradient (#5FFB0F→#F5F607).
 *
 * These are semantic decorations (fixed gold/green), so they do NOT recolor per
 * theme — rendered as <img> from the exported SVGs.
 */
export function SectionHeader({
  title,
  className,
}: {
  title: string
  className?: string
}) {
  return (
    <div
      data-testid="section-header"
      className={cn('relative flex items-center justify-center', className)}
    >
      <div className="relative inline-flex flex-col items-center">
        {/* Title + star (star overlaps the left start of the text). */}
        <div className="relative flex items-center">
          <img
            src={star}
            alt=""
            aria-hidden="true"
            className="absolute top-1/2 -left-5 h-[31px] w-[30px] -translate-y-1/2"
          />
          <h2 className="font-display relative text-[22px] leading-none font-normal text-[#222222]">
            {title}
          </h2>
        </div>
        {/* Real wavy ribbon underline (Vector 2723), centered under the text. */}
        <img
          src={underline}
          alt=""
          aria-hidden="true"
          className="mt-1 h-[12px] w-[69px]"
        />
      </div>
    </div>
  )
}

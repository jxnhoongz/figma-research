import { cn } from '../../lib/cn'
import star from '../../assets/section2/decor/section-star.svg'
import underline from '../../assets/section2/decor/section-underline.svg'

/**
 * Shared section header mirroring Figma "Frame 1410107569" (闯关排列, node 1:985)
 * and the identical "Frame 1410107939" (活动详情). The frame is 100×35 with
 * ABSOLUTE-positioned children (exact offsets from the structure JSON):
 *
 *   - Star 25 (30×31, node 1:987) @ (1, 2)      — the real exported gold star.
 *   - Title TEXT (78×19, YouSheBiaoTiHei 22px #222222 + 1px white OUTSIDE stroke)
 *       @ (11, 8) — the star overlaps its left.
 *   - Vector 2723 (69×12, node 1:986) @ (36, 21) — the wavy green→yellow underline,
 *       offset RIGHT of the title centre and overlapping its baseline (NOT centred).
 *
 * Both headers render from THIS one component → guaranteed identical.
 */
export function SectionHeader({
  title,
  className,
}: {
  title: string
  className?: string
}) {
  return (
    <div className={cn('flex justify-center', className)}>
      {/* 100×35 header frame — children at their exact absolute offsets. */}
      <div data-testid="section-header" className="relative h-[35px] w-[100px]">
        <img
          src={star}
          alt=""
          aria-hidden="true"
          className="absolute top-[2px] left-px h-[31px] w-[30px]"
        />
        <h2
          data-testid="section-title"
          style={{ paintOrder: 'stroke', WebkitTextStroke: '2px #ffffff' }}
          className="font-display absolute top-[8px] left-[11px] text-[22px] leading-none font-normal whitespace-nowrap text-[#222222]"
        >
          {title}
        </h2>
        <img
          src={underline}
          alt=""
          aria-hidden="true"
          className="absolute top-[21px] left-[36px] h-[12px] w-[69px]"
        />
      </div>
    </div>
  )
}

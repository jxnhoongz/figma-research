import { cn } from '../../lib/cn'

/**
 * Shared section header mirroring Figma "Frame 1410107569" (闯关排列, node 1:985)
 * and the identical "Frame 1410107939" (活动详情, node under 1:1197). Both are the
 * SAME 100×35 layout:
 *
 *   - Star 25 (30×31 VECTOR, node 1:987/1:1200): a 5-point star, orange linear
 *     gradient #FFB200→#FF6100 with a 1px white stroke. Sits at the left, its
 *     right half overlapping the start of the title text.
 *   - Title TEXT (22px, YouSheBiaoTiHei display face, #222222).
 *   - Vector 2723 (69×12 VECTOR, node 1:986/1:1199): a short ribbon/rule under
 *     the text, green→yellow linear gradient #5FFB0F→#F5F607.
 *
 * Star 25 (930px²) + Vector 2723 (828px²) are below the plugin's 1500px² export
 * threshold, so neither is in our asset export. We approximate them as inline
 * SVGs sized per the JSON (star 30×31, underline 69×12), with the exact
 * gradients read from the structure JSON fills. The two headers are rendered by
 * THIS one component so they are guaranteed identical.
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
      className={cn(
        'relative flex items-center justify-center',
        className,
      )}
    >
      <div className="relative inline-flex flex-col items-center">
        {/* Title + star (star overlaps the left start of the text). */}
        <div className="relative flex items-center">
          <SectionStar
            aria-hidden="true"
            className="absolute top-1/2 -left-5 h-[31px] w-[30px] -translate-y-1/2"
          />
          <h2 className="font-display relative text-[22px] leading-none font-normal text-[#222222]">
            {title}
          </h2>
        </div>
        {/* Short ribbon/rule underline (Vector 2723), centered under the text. */}
        <SectionUnderline
          aria-hidden="true"
          className="mt-1 h-[12px] w-[69px]"
        />
      </div>
    </div>
  )
}

/** Star 25 (node 1:987) — 5-point star, orange gradient + white stroke. */
function SectionStar(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 30 31" fill="none" {...props}>
      <defs>
        <linearGradient
          id="section-star-fill"
          x1="2.6"
          y1="3.5"
          x2="27.8"
          y2="28.7"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FFB200" />
          <stop offset="1" stopColor="#FF6100" />
        </linearGradient>
      </defs>
      <path
        d="M15 1.5l3.9 8.5 9.3 1-7 6.3 1.9 9.2L15 21.4l-8 4.6 1.9-9.2-7-6.3 9.3-1L15 1.5z"
        fill="url(#section-star-fill)"
        stroke="#fff"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Vector 2723 (node 1:986) — short ribbon underline, green→yellow gradient. */
function SectionUnderline(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 69 12" fill="none" preserveAspectRatio="none" {...props}>
      <defs>
        <linearGradient
          id="section-underline-fill"
          x1="0"
          y1="6"
          x2="69"
          y2="6"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#5FFB0F" />
          <stop offset="1" stopColor="#F5F607" />
        </linearGradient>
      </defs>
      <path
        d="M2 8c14-5 51-5 65 0 1 .4 1 2-1 2.4-20 3.5-42 3.5-62 0C2.2 10.2 1 8.6 2 8z"
        fill="url(#section-underline-fill)"
      />
    </svg>
  )
}

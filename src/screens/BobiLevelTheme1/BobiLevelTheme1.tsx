import { useState } from 'react'
import { NavHeader } from '../../components/NavHeader/NavHeader'
import { Banner } from '../../components/Banner/Banner'
import { TabSwitch } from '../../components/TabSwitch/TabSwitch'
import { type Status } from '../../components/StatusIcon/StatusIcon'
import { StepCard, type StepStat, type StepSide } from '../../components/StepCard/StepCard'
import { StepsContainer } from '../../components/StepsContainer/StepsContainer'
import { ClaimButton } from '../../components/ClaimButton/ClaimButton'
import {
  RewardTable,
  type RewardColumn,
  type RewardRow,
} from '../../components/RewardTable/RewardTable'
import { SectionHeader } from '../../components/SectionHeader/SectionHeader'
import { TAB_ICON } from '../../components/svg'
import { cn } from '../../lib/cn'
import { getTheme, themeVars } from '../../lib/themes'
import mainTexture from '../../assets/section2/decor/main-container-texture.svg'
import bottomHalftone from '../../assets/section2/decor/bottom-halftone.svg'

/**
 * 波币大闯关 theme1 screen, rebuilt 1:1 with the real section2 SVG assets.
 * Presentational; recolors live via the `themeId` prop (sets `--theme-accent`
 * / `--theme-bg`, which the kit SVGs follow through `currentColor`).
 */
interface Step {
  id: string
  status: Status
  title: string
  requirement: string
  statusText: string
  amount: string
  side: StepSide
  active?: boolean
  claimable?: boolean
  claimed?: boolean
  stats?: StepStat[]
}

const TABS = [
  { id: 'yesterday', label: '昨日闯关' },
  { id: 'today', label: '今日闯关' },
]

const TAB_ART = { today: TAB_ICON.today, yesterday: TAB_ICON.yesterday }

const STEPS: Step[] = [
  {
    id: 's1',
    status: 'done',
    title: '第一关',
    requirement: '累计充值 1000元+',
    statusText: '已领取',
    amount: '彩金 8元',
    side: 'left',
    claimed: true,
  },
  {
    id: 's2',
    status: 'done',
    title: '第二关',
    requirement: '累计充值 5000元+',
    statusText: '已领取',
    amount: '彩金 18元',
    side: 'right',
    claimed: true,
  },
  {
    id: 's3',
    status: 'active',
    title: '第三关',
    requirement: '累计充值 10000元+',
    statusText: '当前关卡',
    amount: '彩金 28元',
    side: 'left',
    active: true,
    // The claim action is the big bottom CTA (可领取 3888元), not an inline pill
    // on the card — matches Figma, which shows only 当前关卡 + 彩金 on the wedge.
    stats: [
      { label: '日计充值', value: '3,756', unit: '元' },
      { label: '有效投', value: '65,422', unit: '(0倍)' },
    ],
  },
  {
    id: 's4',
    status: 'fail',
    title: '第四关',
    requirement: '累计充值 5万元+',
    statusText: '闯关失败',
    amount: '彩金 88元',
    side: 'right',
  },
  {
    id: 's5',
    status: 'locked',
    title: '第五关',
    requirement: '累计充值 10万元+',
    statusText: '未解锁',
    amount: '彩金 188元',
    side: 'left',
  },
]

/**
 * 活动详情 rewards table (Figma Frame 1410107570 / node 1:1197+).
 * Header: 日累计充值 / 关卡 / 倍数 tiers (2,5,10,20,50).
 */
// Column widths mirror Figma: label col 80/350 (~22.8%), the six value cols
// 45.5/350 (~13%) each, so the header text + 累计充值 labels sit on one line.
const REWARD_COLUMNS: RewardColumn[] = [
  { id: 'tier', label: '日累计充值', align: 'center', width: '22.8%' },
  { id: 'level', label: '关卡', width: '13%' },
  { id: 'm2', label: '2倍', width: '13%' },
  { id: 'm5', label: '5倍', width: '13%' },
  { id: 'm10', label: '10倍', width: '13%' },
  { id: 'm20', label: '20倍', width: '13%' },
  { id: 'm50', label: '50倍', width: '13%' },
]

const REWARD_ROWS: RewardRow[] = [
  {
    id: 'lv1',
    cells: ['1000元+', '第一关', '8元', '18元', '28元', '38元', '58元'],
    // Figma highlights ONLY the 2倍 reward (8元) of the 第一关 tier in blue —
    // a single cell, not the whole row (node 1:1227, fill #0943D5).
    highlightCells: [2],
  },
  { id: 'lv2', cells: ['5000元+', '第二关', '18元', '28元', '38元', '68元', '88元'] },
  { id: 'lv3', cells: ['10000元+', '第三关', '28元', '38元', '58元', '88元', '188元'] },
  { id: 'lv4', cells: ['50000元+', '第四关', '38元', '68元', '118元', '188元', '388元'] },
  { id: 'lv5', cells: ['100000元+', '第五关', '88元', '118元', '388元', '588元', '888元'] },
  { id: 'lv6', cells: ['500000元+', '第六关', '188元', '288元', '888元', '1188元', '3888元'] },
]

const INFO_DETAIL =
  '即日起，本直播平台新老贵宾凡是使用波币钱包充值，当日累计充值 1000元+达到相应的有效投注，' +
  '次日即可领取闯关礼金，最高达 3888 元，关关有礼，关关相送。'

// 示例 + 活动规则 block rendered below the rewards table (Figma node, exact copy).
const INFO_EXAMPLE =
  '示例：会员若在当日内累计充值达到 10000 元的波币，并完成当日总存款的2倍打码量，' +
  '便可以在次日领取额外的28元彩金，依此类推。领取的彩金只需要达到一倍的投注额即可提款。'

const INFO_RULES = [
  '会员无需申请此活动，彩金将在次日自动发放。若未在次日领取，彩金将失效，视为您已自动放弃此优惠。',
  '会员的存款金额将由系统自动累计，计算的截止时间为北京时间当天23:59:59。超出此时间的存款金额将不计入累计中。',
  '我们保留在任何时间更改、暂停或取消此优惠活动的权利。',
  '参与此活动表明您已同意【一般优惠规则与条款】，我们保留对此活动的最终解释权。',
]

export function BobiLevelTheme1({
  className,
  themeId = 'theme1',
}: {
  className?: string
  themeId?: string
}) {
  // Active tab is 昨日闯关 (LEFT, TABS[0]) — the big decorated tab in Figma.
  const [activeTab, setActiveTab] = useState(TABS[0].id)
  const theme = getTheme(themeId)

  return (
    <div
      data-testid="bobi-screen"
      data-theme={theme.id}
      style={{
        ...themeVars(theme),
        backgroundColor: 'var(--theme-bg)',
        color: 'var(--theme-accent)',
      }}
      className={cn('flex w-[390px] flex-col pb-0', className)}
    >
      <NavHeader title="波币大闯关" />
      <Banner title="波币大闯关" src={theme.banner} />

      {/* Main Container (node 1:973/1:974): a soft-yellow under-glow behind a
          near-white rounded card holding the tab switch + 闯关排列 module. */}
      <div className="px-1.5 pt-1.5">
        <div className="bg-main-glow rounded-card p-1">
          <div className="bg-main-card rounded-card relative overflow-hidden p-2">
            {/* Faint top texture (node 1:978). */}
            <img
              src={mainTexture}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -top-2 right-0 h-32 w-[70%] object-cover opacity-40"
            />

            <div className="relative flex flex-col gap-2">
              <TabSwitch
                tabs={TABS}
                active={activeTab}
                onChange={setActiveTab}
                artByActive={TAB_ART}
              />

              {/* 闯关排列 module (Component 32): serpentine road + overlapping
                  step cards + the real 可领取 claim CTA. */}
              <StepsContainer
                title="闯关排列"
                className="rounded-card"
                footer={<ClaimButton label="可领取" amount="3888" currency="元" />}
              >
                {STEPS.map((step) => (
                  // Each Step Block is a fixed 306px row (icon 51 + gap 10 +
                  // card 245). Status icon is ALWAYS left; only the card's
                  // pointer tab (Polygon 2) alternates via `side` inside
                  // StepCard — the whole row is never flipped.
                  <li key={step.id} className="flex justify-center">
                    <StepCard
                      status={step.status}
                      title={step.title}
                      requirement={step.requirement}
                      statusText={step.statusText}
                      amount={step.amount}
                      side={step.side}
                      active={step.active}
                      claimable={step.claimable}
                      claimed={step.claimed}
                      stats={step.stats}
                    />
                  </li>
                ))}
              </StepsContainer>
            </div>
          </div>
        </div>
      </div>

      {/* 活动详情 section (Frame 1410107935): teal-tile frame with the star
          title, a white inner panel (intro + rewards table), and terms. */}
      <section className="bg-screen relative mt-2.5 px-2.5 pt-2.5 pb-2.5">
        {/* Bottom-left halftone decoration (node 1:1312/1:1313). */}
        <img
          src={bottomHalftone}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -top-12 left-0 h-24 w-24 object-contain opacity-90"
        />

        {/* 活动详情 title — IDENTICAL star + underline header as 闯关排列
            (Frame 1410107939, same component as 1410107569). */}
        <SectionHeader title="活动详情" className="relative pb-2.5" />

        {/* White inner panel (node 1:1202). */}
        <div className="rounded-card bg-white p-2.5">
          <p className="text-text-body text-sm leading-relaxed">{INFO_DETAIL}</p>
          <div className="mt-2.5">
            <RewardTable columns={REWARD_COLUMNS} rows={REWARD_ROWS} />
          </div>

          {/* 示例 + 活动规则 terms block (node 1:1311). */}
          <p className="text-text-body mt-3 text-sm leading-relaxed">
            {INFO_EXAMPLE}
          </p>
          <p className="text-text-body mt-3 text-sm leading-relaxed">活动规则：</p>
          <ul className="text-text-body mt-1 list-disc space-y-2 pl-5 text-sm leading-relaxed">
            {INFO_RULES.map((rule, i) => (
              <li key={i}>{rule}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}

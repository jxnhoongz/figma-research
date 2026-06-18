import { useState } from 'react'
import { NavHeader } from '../../components/NavHeader/NavHeader'
import { Banner } from '../../components/Banner/Banner'
import { TabSwitch } from '../../components/TabSwitch/TabSwitch'
import { type Status } from '../../components/StatusIcon/StatusIcon'
import { StepCard, type StepStat, type StepSide } from '../../components/StepCard/StepCard'
import { StepsContainer } from '../../components/StepsContainer/StepsContainer'
import {
  RewardTable,
  type RewardColumn,
  type RewardRow,
} from '../../components/RewardTable/RewardTable'
import { TAB_ICON } from '../../components/svg'
import { cn } from '../../lib/cn'
import { getTheme, themeVars } from '../../lib/themes'
import decoBottom1 from '../../assets/bobi-theme1/deco-bottom-1.png'
import decoBottom2 from '../../assets/bobi-theme1/deco-bottom-2.png'

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
    claimable: true,
    stats: [
      { label: '日计充值', value: '3,756', unit: '元' },
      { label: '有效投', value: '65,422', unit: '元' },
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
]

/**
 * 活动详情 rewards table (Figma Frame 1410107570 / node 1:1197+).
 * Header: 日累计充值 / 关卡 / 倍数 tiers (2,5,10,20,50).
 */
const REWARD_COLUMNS: RewardColumn[] = [
  { id: 'tier', label: '日累计充值', align: 'left' },
  { id: 'level', label: '关卡' },
  { id: 'm2', label: '2倍' },
  { id: 'm5', label: '5倍' },
  { id: 'm10', label: '10倍' },
  { id: 'm20', label: '20倍' },
  { id: 'm50', label: '50倍' },
]

const REWARD_ROWS: RewardRow[] = [
  {
    id: 'lv1',
    cells: ['1000元+', '第一关', '8元', '18元', '28元', '38元', '58元'],
    highlight: true,
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

export function BobiLevelTheme1({
  className,
  themeId = 'theme1',
}: {
  className?: string
  themeId?: string
}) {
  const [activeTab, setActiveTab] = useState(TABS[1].id)
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

      <TabSwitch
        tabs={TABS}
        active={activeTab}
        onChange={setActiveTab}
        artByActive={TAB_ART}
        className="mx-4 mt-3"
      />

      {/* 闯关排列 container (Figma "Steps List" frame): a frosted box wrapping
          ALL step cards, with the serpentine map path as a background layer
          behind them. Cards alternate sides and overlap the path. */}
      <StepsContainer title="闯关排列">
        {STEPS.map((step) => (
          <li
            key={step.id}
            className={cn(
              'flex',
              step.side === 'right' ? 'justify-end pl-2' : 'justify-start pr-2',
            )}
          >
            <div className="w-[92%]">
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
            </div>
          </li>
        ))}
      </StepsContainer>

      {/* 活动详情 info panel. */}
      <section className="bg-card-grad rounded-card mx-2 mt-2 px-4 pt-4 pb-6">
        <div className="flex justify-center">
          <span className="bg-cta text-on-dark rounded-full px-6 py-1 text-sm font-bold shadow-sm">
            活动详情
          </span>
        </div>
        <p className="text-text-brown mt-3 text-xs leading-relaxed">
          {INFO_DETAIL}
        </p>
        <div className="mt-3">
          <RewardTable columns={REWARD_COLUMNS} rows={REWARD_ROWS} />
        </div>
      </section>

      {/* Decorative illustrations anchored at the very bottom. */}
      <div className="relative h-[110px]">
        <img
          src={decoBottom1}
          alt=""
          aria-hidden="true"
          className="absolute bottom-0 left-0 h-[110px] object-contain"
        />
        <img
          src={decoBottom2}
          alt=""
          aria-hidden="true"
          className="absolute right-0 bottom-0 h-[110px] object-contain"
        />
      </div>
    </div>
  )
}

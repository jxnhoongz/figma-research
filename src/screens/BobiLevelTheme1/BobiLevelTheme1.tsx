import { useState } from 'react'
import { NavHeader } from '../../components/NavHeader/NavHeader'
import { Banner } from '../../components/Banner/Banner'
import { TabSwitch } from '../../components/TabSwitch/TabSwitch'
import { type Status } from '../../components/StatusIcon/StatusIcon'
import { StepCard, type StepStat } from '../../components/StepCard/StepCard'
import {
  RewardTable,
  type RewardColumn,
  type RewardRow,
} from '../../components/RewardTable/RewardTable'
import { cn } from '../../lib/cn'
import decoBottom1 from '../../assets/bobi-theme1/deco-bottom-1.png'
import decoBottom2 from '../../assets/bobi-theme1/deco-bottom-2.png'

/**
 * Sample data for the 波币大闯关 theme1 screen. Static/presentational.
 * Content mirrors assets/figma/bobi-theme1.framelink.yaml (Component 38 ×8).
 */
interface Step {
  id: string
  status: Status
  title: string
  requirement: string
  statusText: string
  amount: string
  /** Active steps surface a claim CTA + progress stats (Figma 第三关). */
  active?: boolean
  claimable?: boolean
  claimed?: boolean
  stats?: StepStat[]
}

const TABS = [
  { id: 'yesterday', label: '昨日闯关' },
  { id: 'today', label: '今日闯关' },
]

const STEPS: Step[] = [
  {
    id: 's1',
    status: 'done',
    title: '第一关',
    requirement: '累计充值 1000元+',
    statusText: '已领取',
    amount: '彩金 8元',
    claimed: true,
  },
  {
    id: 's2',
    status: 'done',
    title: '第二关',
    requirement: '累计充值 5000元+',
    statusText: '已领取',
    amount: '彩金 18元',
    claimed: true,
  },
  {
    id: 's3',
    status: 'active',
    title: '第三关',
    requirement: '累计充值 10000元+',
    statusText: '当前关卡',
    amount: '彩金 28元',
    active: true,
    claimable: true,
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
  },
  {
    id: 's6',
    status: 'locked',
    title: '第六关',
    requirement: '累计充值 50万元+',
    statusText: '待闯关',
    amount: '彩金 188元',
  },
  {
    id: 's7',
    status: 'locked',
    title: '第七关',
    requirement: '累计充值 100万元+',
    statusText: '待闯关',
    amount: '彩金 288元',
  },
  {
    id: 's8',
    status: 'locked',
    title: '第八关',
    requirement: '累计充值 500万元+',
    statusText: '待闯关',
    amount: '彩金 388元',
  },
]

/**
 * 活动详情 rewards table (Figma Frame 1410107570 / node 1:1197+).
 * Header: 日累计充值 / 关卡 / 倍数 tiers (2,5,10,20,50). Each row is a 关卡
 * tier mapping a daily-recharge threshold to the 彩金 payout per multiplier.
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
  {
    id: 'lv2',
    cells: ['5000元+', '第二关', '18元', '28元', '38元', '68元', '88元'],
  },
  {
    id: 'lv3',
    cells: ['10000元+', '第三关', '28元', '38元', '58元', '88元', '188元'],
  },
  {
    id: 'lv4',
    cells: ['50000元+', '第四关', '38元', '68元', '118元', '188元', '388元'],
  },
  {
    id: 'lv5',
    cells: ['100000元+', '第五关', '88元', '118元', '388元', '588元', '888元'],
  },
  {
    id: 'lv6',
    cells: ['500000元+', '第六关', '188元', '288元', '888元', '1188元', '3888元'],
  },
]

const INFO_DETAIL =
  '即日起，本直播平台新老贵宾凡是使用波币钱包充值，当日累计充值 1000元+达到相应的有效投注，' +
  '次日即可领取闯关礼金，最高达 3888 元，关关有礼，关关相送。'

export function BobiLevelTheme1({ className }: { className?: string }) {
  const [activeTab, setActiveTab] = useState(TABS[0].id)

  return (
    <div className={cn('bg-screen flex w-[390px] flex-col pb-0', className)}>
      <NavHeader title="波币大闯关" />
      <Banner title="波币大闯关" />

      <TabSwitch
        tabs={TABS}
        active={activeTab}
        onChange={setActiveTab}
        className="mx-4 mt-4"
      />

      {/* Patterned teal map background (CSS approximation of Map pattern-bg)
          layered behind the step list. */}
      <div className="bg-pattern-map mt-4">
        <div className="flex flex-col gap-3 px-4 py-4">
          {STEPS.map((step) => (
            <StepCard
              key={step.id}
              status={step.status}
              title={step.title}
              requirement={step.requirement}
              statusText={step.statusText}
              amount={step.amount}
              active={step.active}
              claimable={step.claimable}
              claimed={step.claimed}
              stats={step.stats}
            />
          ))}
        </div>
      </div>

      {/* 活动详情 info panel. */}
      <section className="bg-card-grad rounded-card mt-2 px-4 pt-5 pb-6">
        <h2 className="text-text-brown text-lg font-bold">活动详情</h2>
        <div className="bg-on-dark rounded-card mt-3 p-4">
          <p className="text-text-brown text-sm leading-relaxed">
            {INFO_DETAIL}
          </p>
        </div>
        {/* 活动详情 rewards table (Figma 第一关…第六关 rows, node 1:1197+). */}
        <div className="bg-on-dark rounded-card mt-3 p-3">
          <RewardTable columns={REWARD_COLUMNS} rows={REWARD_ROWS} />
        </div>
      </section>

      {/* Decorative illustrations anchored at the very bottom. */}
      <div className="relative h-[120px]">
        <img
          src={decoBottom1}
          alt=""
          aria-hidden="true"
          className="absolute bottom-0 left-0 h-[120px] object-contain"
        />
        <img
          src={decoBottom2}
          alt=""
          aria-hidden="true"
          className="absolute bottom-0 right-0 h-[120px] object-contain"
        />
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Banner } from '../../components/Banner/Banner'
import { TabSwitch } from '../../components/TabSwitch/TabSwitch'
import { StatusIcon, type Status } from '../../components/StatusIcon/StatusIcon'
import { RewardCard } from '../../components/RewardCard/RewardCard'
import { Button } from '../../components/Button/Button'
import { cn } from '../../lib/cn'
import decoBottom1 from '../../assets/bobi-theme1/deco-bottom-1.png'
import decoBottom2 from '../../assets/bobi-theme1/deco-bottom-2.png'

/**
 * Sample data for the 波币大闯关 theme1 screen. Static/presentational:
 * a handful of steps covering all four StatusIcon states (done/active/locked/fail).
 * Content mirrors assets/figma/bobi-theme1.framelink.yaml.
 */
interface Step {
  id: string
  status: Status
  title: string
  requirement: string
  statusText: string
  amount: string
  /** Active steps surface a claim CTA. */
  claimable?: boolean
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
  },
  {
    id: 's2',
    status: 'done',
    title: '第二关',
    requirement: '累计充值 5000元+',
    statusText: '已领取',
    amount: '彩金 18元',
  },
  {
    id: 's3',
    status: 'active',
    title: '第三关',
    requirement: '累计充值 10000元+',
    statusText: '当前关卡',
    amount: '彩金 28元',
    claimable: true,
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
    requirement: '累计充值100万元+',
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

const INFO_DETAIL =
  '即日起，本直播平台新老贵宾凡是使用波币钱包充值，当日累计充值 1000元+达到相应的有效投注，' +
  '次日即可领取闯关礼金，最高达 3888 元，关关有礼，关关相送。'

/**
 * Screen-local layout wrapper. Composes kit primitives (StatusIcon + RewardCard
 * + Button) into one level row — no buttons/cards/icons are re-implemented here.
 */
function StepRow({ step }: { step: Step }) {
  const claimed = step.status === 'done'

  return (
    <div className="flex items-center gap-3">
      <StatusIcon status={step.status} />

      <div className="flex flex-1 flex-col">
        <span className="text-on-dark text-base font-bold">{step.title}</span>
        <span className="text-on-dark/80 text-xs">{step.requirement}</span>
        <span className="text-on-dark/70 text-xs">{step.statusText}</span>
      </div>

      <RewardCard
        label={step.title}
        amount={step.amount}
        claimed={claimed}
        className="min-w-[96px]"
      />

      {step.claimable ? (
        <Button size="md">可领取</Button>
      ) : (
        <Button size="md" variant="secondary" disabled={step.status === 'locked' || step.status === 'fail'}>
          {claimed ? '已领取' : '可领取'}
        </Button>
      )}
    </div>
  )
}

export function BobiLevelTheme1({ className }: { className?: string }) {
  const [activeTab, setActiveTab] = useState(TABS[0].id)

  return (
    <div className={cn('flex w-[390px] flex-col bg-screen pb-0', className)}>
      <Banner title="波币大闯关" />

      <TabSwitch
        tabs={TABS}
        active={activeTab}
        onChange={setActiveTab}
        className="mx-4 mt-4"
      />

      {/* Vertical list of level steps */}
      <div className="mt-4 flex flex-col gap-4 px-4">
        {STEPS.map((step) => (
          <StepRow key={step.id} step={step} />
        ))}
      </div>

      {/* 活动详情 info panel — rounded top corners, card-grad token panel. */}
      <section className="mt-6 rounded-card bg-card-grad px-4 pt-5 pb-6">
        <h2 className="text-text-brown text-lg font-bold">活动详情</h2>
        <div className="mt-3 rounded-card bg-on-dark p-4">
          <p className="text-text-brown text-sm leading-relaxed">{INFO_DETAIL}</p>
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

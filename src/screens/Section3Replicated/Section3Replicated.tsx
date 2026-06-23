import { useState } from 'react'
import { NavHeader } from '../../components/NavHeader/NavHeader'
import { ProgressCard, type ProgressData } from '../../components/ProgressCard/ProgressCard'
import { RewardGrid, type RewardGridItem } from '../../components/RewardGrid/RewardGrid'
import { SectionHeader } from '../../components/SectionHeader/SectionHeader'
import { cn } from '../../lib/cn'

import bannerUrl from '../../assets/section3/img/Banner_1-33253.png'
import tableUrl from '../../assets/section3/img/Frame_1410162754_1-34042.svg'
import card1 from '../../assets/section3/img/Reward_Card_1-32672.png'
import card2 from '../../assets/section3/img/Frame_1410162755_1-32673.png'
import card3 from '../../assets/section3/img/Reward_Card_1-33670.png'
import card4 from '../../assets/section3/img/Frame_1410162759_1-33671.png'
import card5 from '../../assets/section3/img/Frame_1410162746_1-33672.png'
import card6 from '../../assets/section3/img/Frame_1410162747_1-33673.png'
import card7 from '../../assets/section3/img/Frame_1410162749_1-33674.png'
import card8 from '../../assets/section3/img/Frame_1410162750_1-33675.png'
import card9 from '../../assets/section3/img/Frame_1410162762_1-33676.png'
import card10 from '../../assets/section3/img/Frame_1410162758_1-33677.png'
import card11 from '../../assets/section3/img/Frame_1410162760_1-33678.png'
import card12 from '../../assets/section3/img/Frame_1410162761_1-33679.png'

const PROGRESS_DATA: ProgressData = {
  currentBet: '266',
  currentBetLabel: '当前有效投注',
  nextTierGap: '734',
  nextTierLabel: '距离下一档 5元 还差',
  target: '1000',
  targetLabel: '目标',
  progressRatio: 0.266,
  claimAmount: '5',
}

const REWARD_ITEMS: RewardGridItem[] = [
  { id: 'rc1', src: card1, alt: '¥5 奖励', current: true },
  { id: 'rc2', src: card2, alt: '¥8 奖励' },
  { id: 'rc3', src: card3, alt: '¥18 奖励' },
  { id: 'rc4', src: card4, alt: '¥28 奖励' },
  { id: 'rc5', src: card5, alt: '¥88 奖励' },
  { id: 'rc6', src: card6, alt: '¥188 奖励' },
  { id: 'rc7', src: card7, alt: '¥588 奖励' },
  { id: 'rc8', src: card8, alt: '¥1888 奖励' },
  { id: 'rc9', src: card9, alt: '¥3888 奖励' },
  { id: 'rc10', src: card10, alt: '¥4888 奖励' },
  { id: 'rc11', src: card11, alt: '¥5888 奖励' },
  { id: 'rc12', src: card12, alt: '¥8888 奖励' },
]

const FINE_PRINT = `1. 每自然日0点至23点59分的有效流水计入活动，次日0点重新计算。
2. 有效投注统计实时刷新，请以实际到账数据为准。
3. 活动期间每档彩金只可领取一次，不可重复领取。
4. 彩金到账后需完成1倍流水方可提款。
5. 如发现任何欺诈或套利行为，平台有权取消奖励资格并冻结账户。
6. 本活动最终解释权归平台所有。`

/**
 * Section 3 "点击领取" replicated screen. Implements the React component tree
 * from the Figma IR using reused NavHeader, new ProgressCard, new RewardGrid,
 * and baked images for banner, mascot, reward table, and individual card art.
 */
export function Section3Replicated({ className }: { className?: string }) {
  const [claimed, setClaimed] = useState(false)

  return (
    <div
      data-testid="scene-root"
      className={cn('w-[390px] bg-white overflow-hidden', className)}
    >
      {/* 1. Nav header */}
      <NavHeader title="逢6必发" />

      {/* 2. Banner */}
      <img
        src={bannerUrl}
        alt="逢6必发活动横幅"
        className="w-full block"
      />

      {/* 3. Progress card */}
      <div className="px-[7px] mt-[calc(335px-84px-256px)]">
        <ProgressCard
          data={PROGRESS_DATA}
          onClaim={() => setClaimed(true)}
          claimed={claimed}
        />
      </div>

      {/* 4. Reward preview section */}
      <div className="mt-6 px-[7px]">
        <SectionHeader title="奖励预览" className="mb-3" />
        <div className="rounded-[20px] bg-white shadow-sm overflow-hidden">
          <RewardGrid items={REWARD_ITEMS} />
        </div>
      </div>

      {/* 5. Activity details section */}
      <div className="mt-6 px-[7px]">
        <SectionHeader title="活动详情" className="mb-3" />
        <img
          src={tableUrl}
          alt="活动详情奖励表格"
          className="w-full block"
        />
      </div>

      {/* 6. Activity rules section */}
      <div className="mt-6 px-[7px] pb-8">
        <SectionHeader title="活动细则" className="mb-3" />
        <p className="text-table-text text-xs leading-6 whitespace-pre-line">
          {FINE_PRINT}
        </p>
      </div>
    </div>
  )
}

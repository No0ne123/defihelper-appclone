import clsx from 'clsx'

import { AppLayout } from '~/layouts'
import { PortfolioChartOfAllTokens } from '~/portfolio/portfolio-chart-of-all-tokens'
import { Head } from '~/common/head'
import { Typography } from '~/common/typography'
import { PortfolioMetricCard } from './common'
import { bignumberUtils } from '~/common/bignumber-utils'
import { PortfolioAssets } from './portfolio-assets'
import { PortfolioWallets } from './portfolio-wallets/portfolio-wallets'
import * as styles from './portfolio.css'

export type PortfolioProps = unknown

export const Portfolio: React.VFC<PortfolioProps> = () => {
  return (
    <AppLayout>
      <Head title="Portfolio" />
      <Typography variant="h3" className={styles.title}>
        Portfolio
      </Typography>
      <div className={styles.cards}>
        <PortfolioMetricCard
          title="Total Net Worth"
          value={<>${bignumberUtils.format('1248726')}</>}
          growthValue={<>-</>}
        />
        <PortfolioMetricCard
          title="Avg. APY total"
          value={<>-</>}
          growthValue={<>-</>}
        />
        <PortfolioMetricCard
          title="Unclaimed reward"
          value={<>-</>}
          growthValue={<>-</>}
        />
      </div>
      <div className={clsx(styles.grid, styles.section)}>
        <PortfolioChartOfAllTokens variant="total" className={styles.mainChart}>
          Total Net Worth Dynamics
        </PortfolioChartOfAllTokens>
        <PortfolioChartOfAllTokens variant="estimated">
          Estimated Earnings
        </PortfolioChartOfAllTokens>
        <PortfolioChartOfAllTokens variant="balance">
          Coin Balance
        </PortfolioChartOfAllTokens>
      </div>
      <PortfolioAssets className={styles.section} />
      <PortfolioWallets />
    </AppLayout>
  )
}

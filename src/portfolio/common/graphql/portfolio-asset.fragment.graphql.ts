import { gql } from '@urql/core'

export const PORTFOLIO_ASSET_FRAGMENT = gql`
  fragment portfolioAsset on TokenAlias {
    symbol
    name
    logoUrl
    metric {
      myPortfolioPercent
      myUSD
      myBalance
    }
  }
`
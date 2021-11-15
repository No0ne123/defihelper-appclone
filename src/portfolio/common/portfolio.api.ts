import { getAPIClient } from '~/api'
import {
  AddWalletMutation,
  AddWalletMutationVariables,
  BlockChainsQuery,
  BlockChainsQueryVariables,
  TokenMetricChartQuery,
  TokenMetricChartQueryVariables,
  TokenMetricQuery,
  MyMetricQuery,
  MyMetricQueryVariables,
  TokenMetricQueryVariables,
  PortfolioEstimatedQuery,
  PortfolioEstimatedQueryVariables,
} from '~/graphql/_generated-types'
import {
  ADD_WALLET,
  BLOCKCHAINS,
  MY_METRIC,
  PORTFOLIO_ESTIMATED,
  TOKEN_METRIC,
  TOKEN_METRIC_CHART,
} from './graphql'

export const portfolioApi = {
  getTokenMetricChart: (variables: TokenMetricChartQueryVariables) =>
    getAPIClient()
      .query<TokenMetricChartQuery, TokenMetricChartQueryVariables>(
        TOKEN_METRIC_CHART,
        variables
      )
      .toPromise()
      .then(({ data }) => data?.me),

  getBlockchains: (variables: BlockChainsQueryVariables) =>
    getAPIClient()
      .query<BlockChainsQuery, BlockChainsQueryVariables>(
        BLOCKCHAINS,
        variables
      )
      .toPromise()
      .then(({ data }) => data?.me?.blockchains ?? []),

  addWallet: (variables: AddWalletMutationVariables) =>
    getAPIClient()
      .mutation<AddWalletMutation, AddWalletMutationVariables>(
        ADD_WALLET,
        variables
      )
      .toPromise()
      .then(({ data }) => data?.addWallet),

  getTokenMetric: (variables?: TokenMetricQueryVariables) =>
    getAPIClient()
      .query<TokenMetricQuery, TokenMetricQueryVariables>(
        TOKEN_METRIC,
        variables
      )
      .toPromise()
      .then(({ data }) => data?.me),

  myMetric: (variables?: MyMetricQueryVariables) =>
    getAPIClient()
      .query<MyMetricQuery, MyMetricQueryVariables>(MY_METRIC, variables)
      .toPromise()
      .then(({ data }) => data?.me?.metric),

  earnings: (variables: PortfolioEstimatedQueryVariables) =>
    getAPIClient()
      .query<PortfolioEstimatedQuery, PortfolioEstimatedQueryVariables>(
        PORTFOLIO_ESTIMATED,
        variables
      )
      .toPromise()
      .then(({ data }) => data?.restakeStrategy),
}
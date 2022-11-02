import { getAPIClient } from '~/api'
import {
  BuyLiquidityProtocolsQuery,
  BuyLiquidityProtocolsQueryVariables,
  BuyLiquidityContractsQuery,
  BuyLiquidityContractsQueryVariables,
  BuyLiquidityProtocolsSelectQuery,
  BuyLiquidityProtocolsSelectQueryVariables,
  BlockchainsSelectQueryVariables,
  BlockchainsSelectQuery,
  ZapFeePayCreateMutationVariables,
  ZapFeePayCreateMutation,
} from '~/api/_generated-types'
import { BLOCKCHAINS_SELECT } from './graphql/blockchains-select.graphql'
import { BUY_LIQUIDITY_CONTRACT_LIST } from './graphql/buy-liquidity-contract-list.graphql'
import { BUY_LIQUIDITY_PROTOCOL_LIST_SELECT } from './graphql/buy-liquidity-protocol-list-select.graphql'
import { BUY_LIQUIDITY_PROTOCOL_LIST } from './graphql/buy-liquidity-protocol-list.graphql'
import { ZAP_FEE_PAY_CREATE } from './graphql/zap-fee-pay-create.graphql'

export const lpTokensApi = {
  protocols: (
    variables: BuyLiquidityProtocolsQueryVariables,
    signal: AbortSignal
  ) =>
    getAPIClient()
      .request<
        BuyLiquidityProtocolsQuery,
        unknown,
        BuyLiquidityProtocolsQueryVariables
      >(
        {
          query: BUY_LIQUIDITY_PROTOCOL_LIST.loc?.source.body ?? '',
          variables,
        },
        {
          fetchOptionsOverrides: {
            signal,
          },
        }
      )
      .then(({ data }) => data?.protocols.list ?? []),

  protocolsSelect: (
    variables: BuyLiquidityProtocolsSelectQueryVariables,
    signal: AbortSignal
  ) =>
    getAPIClient()
      .request<
        BuyLiquidityProtocolsSelectQuery,
        unknown,
        BuyLiquidityProtocolsSelectQueryVariables
      >(
        {
          query: BUY_LIQUIDITY_PROTOCOL_LIST_SELECT.loc?.source.body ?? '',
          variables,
        },
        {
          fetchOptionsOverrides: {
            signal,
          },
        }
      )
      .then(({ data }) => data?.protocols.list ?? []),

  blockchainsSelect: (
    variables: BlockchainsSelectQueryVariables,
    signal: AbortSignal
  ) =>
    getAPIClient()
      .request<
        BlockchainsSelectQuery,
        unknown,
        BlockchainsSelectQueryVariables
      >(
        {
          query: BLOCKCHAINS_SELECT.loc?.source.body ?? '',
          variables,
        },
        {
          fetchOptionsOverrides: {
            signal,
          },
        }
      )
      .then(({ data }) => data?.config.blockchain.ethereum ?? []),

  contracts: (
    variables: BuyLiquidityContractsQueryVariables,
    signal: AbortSignal
  ) =>
    getAPIClient()
      .request<
        BuyLiquidityContractsQuery,
        unknown,
        BuyLiquidityContractsQueryVariables
      >(
        {
          query: BUY_LIQUIDITY_CONTRACT_LIST.loc?.source.body ?? '',
          variables,
        },
        {
          fetchOptionsOverrides: {
            signal,
          },
        }
      )
      .then(({ data }) => ({
        list: data?.contracts.list ?? [],
        count: data?.contracts.pagination.count ?? 0,
      })),

  zapFeePayCreate: (input: ZapFeePayCreateMutationVariables['input']) =>
    getAPIClient()
      .request<
        ZapFeePayCreateMutation,
        unknown,
        ZapFeePayCreateMutationVariables
      >({
        query: ZAP_FEE_PAY_CREATE.loc?.source.body ?? '',
        variables: {
          input,
        },
      })
      .then(({ data }) => data?.zapFeePayCreate),
}

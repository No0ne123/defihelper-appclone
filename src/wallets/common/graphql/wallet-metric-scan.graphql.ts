import { gql } from '@urql/core'

export const WALLET_METRIC_SCAN = gql`
  mutation WalletMetricScan($wallet: UuidType!, $contract: UuidType!) {
    walletMetricScan(wallet: $wallet, contract: $contract)
  }
`

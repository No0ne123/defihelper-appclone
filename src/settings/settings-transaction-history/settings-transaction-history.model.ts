import { createDomain, restore, combine } from 'effector-logger/macro'
import { createGate } from 'effector-react'
import { BillingHistoryQueryVariables } from '~/graphql/_generated-types'

import { settingsApi } from '~/settings/common'
import * as settingsWalletsModel from '~/settings/settings-wallets/settings-wallets.model'

export const billingHistoryDomain = createDomain()

export const fetchBillingHistoryFx = billingHistoryDomain.createEffect(
  async (variables: BillingHistoryQueryVariables) =>
    settingsApi.history(variables)
)

const $billingHistory = restore(
  fetchBillingHistoryFx.doneData.map(({ list }) => list),
  []
)

export const $count = restore(
  fetchBillingHistoryFx.doneData.map(({ count }) => count),
  0
)

export const $history = combine(
  $billingHistory,
  settingsWalletsModel.$wallets,
  (billingHistory, wallets) => {
    return billingHistory.map((billinghistoryItem) => {
      const wallet = wallets.find(
        (walletItem) =>
          walletItem.blockchain === billinghistoryItem.bill?.blockchain &&
          walletItem.network === billinghistoryItem.bill?.network &&
          walletItem.address === billinghistoryItem.bill?.account
      )

      return {
        ...billinghistoryItem,
        wallet,
      }
    })
  }
)

export const BillingHistoryGate = createGate({
  name: 'BillingHistoryGate',
  domain: billingHistoryDomain,
})
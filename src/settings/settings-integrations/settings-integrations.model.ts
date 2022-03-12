import { createDomain, combine, restore, guard } from 'effector-logger/macro'
import omit from 'lodash.omit'

import {
  IntegrationBinanceConnectMutationVariables,
  WalletExchangeFragmentFragment,
  WalletExchangeTypeEnum,
} from '~/graphql/_generated-types'
import { settingsApi } from '~/settings/common'
import { toastsService } from '~/toasts'
import { portfolioApi, portfolioSortAssetsByWallet } from '~/portfolio/common'
import { authModel } from '~/auth'

export type Integrations = Record<
  string,
  | (WalletExchangeFragmentFragment & {
      deleting?: boolean
      adding?: boolean
    })
  | undefined
>

export const integrationListDomain = createDomain()

export const fetchEstablishedIntegrationsListFx =
  integrationListDomain.createEffect(async () => settingsApi.integrationList())

export const connectIntegrationBinanceFx = integrationListDomain.createEffect(
  async (
    input: IntegrationBinanceConnectMutationVariables['input'] & {
      exchange: WalletExchangeTypeEnum
    }
  ) => {
    const data = await settingsApi.integrationBinanceConnect({
      input: omit(input, 'exchange'),
    })

    if (!data)
      throw new Error(
        'Please, verify your keys pair, the pair is expired or wrong'
      )

    return data
  }
)

export const fetchAssetsByIntegration = (exchangeId: string) =>
  portfolioApi
    .getAssetsListByExchange({ exchangeId })
    .then(portfolioSortAssetsByWallet)

export const fetchAssetsByIntegrationFx = integrationListDomain.createEffect(
  fetchAssetsByIntegration
)

export const $assetsByIntegration = restore(
  fetchAssetsByIntegrationFx.doneData,
  []
)

export const openIntegration = integrationListDomain.createEvent<
  string | null
>()

export const $openedIntegration = integrationListDomain
  .createStore<string | null>(null)
  .on(openIntegration, (_, payload) => payload)

guard({
  clock: $openedIntegration.updates,
  filter: (integrationId): integrationId is string => Boolean(integrationId),
  target: fetchAssetsByIntegrationFx,
})

export const disconnectIntegrationFx = integrationListDomain.createEffect(
  async (integrationId: string) => {
    const data = await settingsApi.integrationDisconnect(integrationId)

    if (!data) throw new Error('something went wrong')

    return data
  }
)

export const $integrationsList = integrationListDomain
  .createStore<
    (WalletExchangeFragmentFragment & {
      deleting?: boolean
    })[]
  >([])
  .on(fetchEstablishedIntegrationsListFx.doneData, (_, payload) => payload)
  .on(disconnectIntegrationFx, (state, payload) => {
    return state.map((integration) =>
      integration.id === payload
        ? { ...integration, deleting: true }
        : integration
    )
  })
  .on(disconnectIntegrationFx.done, (state, payload) => {
    return state.filter(
      (integration) => integration.id !== payload.params && payload.result
    )
  })
  .on(connectIntegrationBinanceFx.done, (state, payload) => {
    return [...state, payload.result]
  })

export const $connectAdding = integrationListDomain
  .createStore<WalletExchangeFragmentFragment['exchange'] | null>(null)
  .on(connectIntegrationBinanceFx, (_, { exchange }) => exchange)
  .on(connectIntegrationBinanceFx.finally, () => null)

export const $integrations = combine($integrationsList, (integrations) => {
  return integrations.reduce<Integrations>((acc, integration) => {
    acc[integration.exchange] = integration

    return acc
  }, {})
})

$assetsByIntegration.reset(authModel.logoutFx.done)
toastsService.forwardErrors(
  fetchEstablishedIntegrationsListFx.failData,
  connectIntegrationBinanceFx.failData,
  disconnectIntegrationFx.failData
)
import { createDomain, sample } from 'effector'
import { createGate } from 'effector-react'
import { automationApi } from '~/automations/common/automation.api'
import { MonitoringAutomateRunHistoryFilterEnum } from '~/api/_generated-types'
import { protocolsApi } from '~/protocols/common'
import { usersApi } from '~/users/common/users.api'
import { networksConfig } from '~/networks-config'
import { settingsApi } from '~/settings/common'

const monitoringDomain = createDomain()

export const fetchAutomationsSuccessfulRunsHistoryFx =
  monitoringDomain.createEffect(() => {
    return automationApi.getAutomationsRunsHistory({
      filter: MonitoringAutomateRunHistoryFilterEnum.OnlySuccessful,
    })
  })

export const fetchDfhProtocolEarningsHistoryFx = monitoringDomain.createEffect(
  async (network: string) => {
    return {
      points: await protocolsApi.dfhProtocolEarningHistory({ network }),
      network,
    }
  }
)

export const fetchAutomationsFailedRunsHistoryFx =
  monitoringDomain.createEffect(() => {
    return automationApi.getAutomationsRunsHistory({
      filter: MonitoringAutomateRunHistoryFilterEnum.OnlyFailed,
    })
  })

export const fetchUsersRegisteringHistoryFx = monitoringDomain.createEffect(
  () => {
    return usersApi.getUsersRegisteringHistory({})
  }
)

export const fetchWalletsRegisteringHistoryFx = monitoringDomain.createEffect(
  () => {
    return usersApi.getWalletsRegisteringHistory({})
  }
)

export const fetchTelegramContactsHistoryFx = monitoringDomain.createEffect(
  () => {
    return settingsApi.getContactsTelegramHistory({})
  }
)

export const fetchAutomationsCreationHistoryFx = monitoringDomain.createEffect(
  () => {
    return automationApi.getAutomationsCreationHistory()
  }
)

export const fetchAutomationsAutorestakeCreationHistoryFx =
  monitoringDomain.createEffect(() => {
    return automationApi.getAutomationsAutorestakeCreationHistory()
  })

export const $usersRegisteringHistory = monitoringDomain
  .createStore<{ date: string; number: number }[]>([])
  .on(fetchUsersRegisteringHistoryFx.doneData, (_, payload) => payload)

export const $walletsRegisteringHistory = monitoringDomain
  .createStore<{ date: string; number: number }[]>([])
  .on(fetchWalletsRegisteringHistoryFx.doneData, (_, payload) => payload)

export const $contactsTelegramHistory = monitoringDomain
  .createStore<{ date: string; number: number }[]>([])
  .on(fetchTelegramContactsHistoryFx.doneData, (_, payload) => payload)

export const $automationsCreationHistory = monitoringDomain
  .createStore<{ date: string; number: number }[]>([])
  .on(fetchAutomationsCreationHistoryFx.doneData, (_, payload) => payload)

export const $automationsSuccessfulRunsHistory = monitoringDomain
  .createStore<{ date: string; number: number }[]>([])
  .on(
    fetchAutomationsSuccessfulRunsHistoryFx.doneData,
    (_, payload) => payload.list
  )

export const $automationsFailedRunsHistory = monitoringDomain
  .createStore<{ date: string; number: number }[]>([])
  .on(
    fetchAutomationsFailedRunsHistoryFx.doneData,
    (_, payload) => payload.list
  )

export const $automationsAutorestakeCreationHistory = monitoringDomain
  .createStore<{ date: string; number: number }[]>([])
  .on(
    fetchAutomationsAutorestakeCreationHistoryFx.doneData,
    (_, payload) => payload
  )

export const $dfhEarningsHistory = monitoringDomain
  .createStore<{ [network: string]: { date: string; number: number }[] }>({})
  .on(fetchDfhProtocolEarningsHistoryFx.doneData, (state, payload) => {
    return {
      ...state,
      [payload.network]: payload.points ?? [],
    }
  })

export const fetchMetricsSyncFx = monitoringDomain.createEffect(async () => {
  const metricsFxList = [
    fetchUsersRegisteringHistoryFx(),
    fetchWalletsRegisteringHistoryFx(),
    fetchAutomationsCreationHistoryFx(),
    fetchAutomationsAutorestakeCreationHistoryFx(),
    fetchAutomationsSuccessfulRunsHistoryFx(),
    fetchAutomationsFailedRunsHistoryFx(),
    fetchTelegramContactsHistoryFx(),
    ...Object.values(networksConfig).map((network) =>
      fetchDfhProtocolEarningsHistoryFx(network.chainId.toString())
    ),
  ]

  await metricsFxList.reduce(async (promise, networkEarningFx) => {
    await promise
    await networkEarningFx
  }, Promise.resolve())
})

export const MonitoringGate = createGate({
  domain: monitoringDomain,
  name: 'MonitoringGate',
})

sample({
  clock: MonitoringGate.open,
  target: [fetchMetricsSyncFx],
})

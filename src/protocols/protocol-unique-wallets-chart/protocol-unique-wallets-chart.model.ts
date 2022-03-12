import { createDomain, UnitValue } from 'effector-logger/macro'

import { dateUtils } from '~/common/date-utils'
import { MetricGroupEnum } from '~/graphql/_generated-types'
import { protocolsApi } from '~/protocols/common'

const protocolMetricOverviewDomain = createDomain()

const DAYS_LIMITS = {
  [MetricGroupEnum.Hour]: 7,
  [MetricGroupEnum.Day]: 30,
  [MetricGroupEnum.Week]: 90,
  [MetricGroupEnum.Month]: 180,
} as const

export const fetchMetricFx = protocolMetricOverviewDomain.createEffect(
  async (params: { protocolId: string }) => {
    const data = await protocolsApi.protocolUniqueWallets({
      filter: {
        id: params.protocolId,
      },
      metricGroup: MetricGroupEnum.Day,
      metricFilter: {
        dateBefore: dateUtils.now(),
        dateAfter: dateUtils.fromNowTo(DAYS_LIMITS[MetricGroupEnum.Day]),
      },
      metricPagination: {
        limit: DAYS_LIMITS[MetricGroupEnum.Day],
      },
    })

    return data
  }
)

export const $metric = protocolMetricOverviewDomain
  .createStore<UnitValue<typeof fetchMetricFx.doneData>>([])
  .on(fetchMetricFx.doneData, (_, payload) => payload)
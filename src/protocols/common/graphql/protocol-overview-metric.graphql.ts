import { gql } from '@urql/core'

import { PROTOCOL_METRIC_CHART } from './protocol-metric-chart.fragment.graphql'

export const PROTOCOL_OVERVIEW_METRIC = gql`
  query ProtocolOverviewMetric(
    $filter: ProtocolFilterInputType!
    $metricGroup: MetricGroupEnum!
    $metricFilter: ProtocolMetricChartContractsFilterInputType
    $metricSort: [ProtocolMetricChartContractsSortInputType!]
    $metricPagination: ProtocolMetricChartContractsPaginationInputType
  ) {
    protocol(filter: $filter) {
      tvl: metricChartContracts(
        metric: tvl
        group: $metricGroup
        filter: $metricFilter
        sort: $metricSort
        pagination: $metricPagination
      ) {
        ...protocolMetricChart
      }
      uniqueWalletsCount: metricChartContracts(
        metric: uniqueWalletsCount
        group: $metricGroup
        filter: $metricFilter
        sort: $metricSort
        pagination: $metricPagination
      ) {
        ...protocolMetricChart
      }
    }
  }
  ${PROTOCOL_METRIC_CHART}
`
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import clsx from 'clsx'
import { useEffect } from 'react'

import { Loader } from '~/common/loader'
import { useTheme } from '~/common/theme'
import { ReactComponent as WTFCopyright } from '~/assets/icons/WTF_transparant.svg'
import * as styles from './trade-chart.css'
import { Link } from '~/common/link'

export type TradeChartProps = {
  className?: string
  address?: string
  loading?: boolean
}

const WTF_LINK = 'https://whattofarm.io/'

export const TradeChart: React.VFC<TradeChartProps> = (props) => {
  const [themeMode = 'light'] = useTheme()

  useEffect(() => {
    if (props.loading || !window.TradingView || !props.address) return

    localStorage.setItem(
      'tradingview.IntervalWidget.quicks',
      JSON.stringify(['1', '5', '15', '60', '240', 'D'])
    )
    localStorage.setItem(
      'tradingview.StyleWidget.quicks',
      JSON.stringify([1, 2])
    )
    localStorage.setItem('tradingview.chart.lastUsedStyle', '1')

    const [firstChar, ...restChars] = Array.from(themeMode)

    const tradingView = new window.TradingView.widget({
      symbol: props.address,
      interval: '60',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      container: 'tv_chart_container',
      locale: 'en',
      datafeed: new (window as any).Datafeeds.UDFCompatibleDatafeed(
        `https://whattofarm.io/api/v2/open/chart/pair`,
        20000
      ),
      library_path: `tradingview/charting_library/`,
      autosize: true,
      fullscreen: false,
      theme: [firstChar.toLocaleUpperCase(), ...restChars].join(''),
      client_id: 'tradingview.com',
      user_id: 'public_user_id',
      overrides: {
        'mainSeriesProperties.statusViewStyle.symbolTextSource':
          'ticker-and-description',
        'mainSeriesProperties.priceAxisProperties.autoScale': true,
      },
      disabled_features: [
        'header_symbol_search',
        'header_compare',
        'header_fullscreen_button',
      ],
      charts_storage_url: 'https://saveload.tradingview.com',
      charts_storage_api_version: '1.1',
    })

    return () => {
      tradingView.remove()
    }
  }, [props.address, themeMode, props.loading])

  return props.loading ? (
    <div className={styles.loader}>
      <Loader height={36} />
    </div>
  ) : (
    <div className={clsx(styles.root, props.className)}>
      <div className={styles.chart} id="tv_chart_container" />
      <Link href={WTF_LINK} target="_blank" className={styles.copyright}>
        <WTFCopyright className={styles.copyrightIcon} />
      </Link>
    </div>
  )
}

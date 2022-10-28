import clsx from 'clsx'
import { useStore } from 'effector-react'
import isEmpty from 'lodash.isempty'
import React, { useEffect, useMemo, useState } from 'react'
import { Sticky, StickyContainer } from 'react-sticky'
import contracts from '@defihelper/networks/contracts.json'

import { bignumberUtils } from '~/common/bignumber-utils'
import { SmartTradeOrderStatusEnum } from '~/api'
import { buildExplorerUrl } from '~/common/build-explorer-url'
import { Button } from '~/common/button'
import { ButtonBase } from '~/common/button-base'
import { dateUtils } from '~/common/date-utils'
import { useDialog } from '~/common/dialog'
import { Dropdown } from '~/common/dropdown'
import { Icon } from '~/common/icon'
import { Input } from '~/common/input'
import { Link } from '~/common/link'
import { Loader } from '~/common/loader'
import { Paper } from '~/common/paper'
import { Typography } from '~/common/typography'
import { networksConfig } from '~/networks-config'
import { TradeStatusChart } from '~/trade/common/trade-status-chart'
import { hasBoughtPrice, Order } from '~/trade/common/trade.types'
import { Exchange, tradeApi } from '~/trade/common/trade.api'
import { TradeOrderDeposit } from '~/trade/common/trade-order-deposit'
import { useWalletConnect } from '~/wallets/wallet-connect'
import { walletNetworkModel } from '~/wallets/wallet-networks'
import { switchNetwork } from '~/wallets/common'
import {
  SettingsSuccessDialog,
  TransactionEnum,
  SettingsWalletBalanceDialog,
  useOnBillingTransferCreatedSubscription,
  useOnBillingTransferUpdatedSubscription,
} from '~/settings/common'
import { analytics } from '~/analytics'
import { SmartTradeRouter, SmartTradeSwapHandler } from '~/common/load-adapter'
import * as settingsWalletModel from '~/settings/settings-wallets/settings-wallets.model'
import { authModel } from '~/auth'
import { TradeEditDialog } from '~/trade/common/trade-edit-dialog'
import * as styles from './trade-orders.css'
import * as model from './trade-orders.model'

export type TradeOrdersProps = {
  className?: string
  onCancelOrder: (values: {
    orderNumber: number | string
    id: string
  }) => Promise<void>
  onUpdatePrice?: () => void
  updating?: boolean
  router?: SmartTradeRouter['methods']
  swap?: SmartTradeSwapHandler['methods']
  exchangesMap: Map<string, Exchange>
}

enum Tabs {
  Active = 'active',
  History = 'history',
}

const statuses = {
  [Tabs.Active]: [
    SmartTradeOrderStatusEnum.Pending,
    SmartTradeOrderStatusEnum.Succeeded,
  ],
  [Tabs.History]: [
    SmartTradeOrderStatusEnum.Processed,
    SmartTradeOrderStatusEnum.Canceled,
  ],
}

export const TradeOrders: React.VFC<TradeOrdersProps> = (props) => {
  const orders = useStore(model.$orders)

  const loading = useStore(model.fetchOrdersFx.pending)
  const claimingOrder = useStore(model.$claimingOrder)
  const depositingOrder = useStore(model.$depositingOrder)
  const editingOrder = useStore(model.$editingOrder)

  const [currentTab, setCurrentTab] = useState(Tabs.Active)

  const [updatingOrderId, setUpdatingOrderId] = useState('')

  const [openTradeEditDialog] = useDialog(TradeEditDialog)

  const handleConnect = useWalletConnect()
  const currentWallet = walletNetworkModel.useWalletNetwork()

  const [openSuccess] = useDialog(SettingsSuccessDialog)
  const [openBalanceDialog] = useDialog(SettingsWalletBalanceDialog)

  const handleChangeTab = (tab: Tabs) => () => {
    setCurrentTab(tab)
  }

  const handleClaim = (order: Order) => async () => {
    if (!hasBoughtPrice(order.callData) || !props.router) return

    const [tokenAddress] = order.callData.path.slice(-1)

    try {
      model.claimStarted(order.id)

      const res = await props.router.refund(tokenAddress, '')

      await res.tx?.wait()
    } catch {
      console.error('error')
    } finally {
      model.claimEnded()
    }
  }

  useEffect(() => {
    if (!props.swap) return

    model.fetchOrdersFx({
      filter: {
        status: statuses[currentTab],
      },
      swap: props.swap,
    })

    return () => {
      model.reset()
    }
  }, [currentTab, props.swap])

  const handleUpdatePrice = (orderId?: string) => () => {
    props.onUpdatePrice?.()

    if (!orderId) return

    setUpdatingOrderId(orderId)
  }

  useEffect(() => {
    if (props.updating) return

    setUpdatingOrderId('')
  }, [updatingOrderId, props.updating])

  const handleDeposit =
    (order: Exclude<typeof orders, null>['list'][number]) => async () => {
      try {
        model.depositStarted(order.id)

        analytics.log('settings_wallet_defihelper_balance_top_up_click')
        await switchNetwork(order.owner.network)

        if (!currentWallet?.account || !currentWallet.chainId) return

        const balanceAdapter = await settingsWalletModel.loadAdapterFx({
          provider: currentWallet.provider,
          chainId: currentWallet.chainId,
          type:
            'BalanceUpgradable' in
            contracts[order.owner.network as keyof typeof contracts]
              ? 'BalanceUpgradable'
              : 'Balance',
        })

        const billingBalance = await settingsWalletModel.fetchBillingBalanceFx({
          blockchain: order.owner.blockchain,
          network: order.owner.network,
        })

        const result = await openBalanceDialog({
          adapter: balanceAdapter,
          recomendedIncome: billingBalance.recomendedIncome,
          priceUSD: billingBalance.priceUSD,
          wallet: currentWallet.account,
          network: currentWallet.chainId,
          token: billingBalance.token,
        })

        await settingsWalletModel.depositFx({
          blockchain: order.owner.blockchain,
          amount: result.amount,
          walletAddress: currentWallet.account,
          chainId: String(currentWallet.chainId),
          provider: currentWallet.provider,
          transactionHash: result.transactionHash,
        })

        await openSuccess({
          type: TransactionEnum.deposit,
        })
      } catch (error) {
        console.error(error)
      } finally {
        model.depositEnded()
      }
    }

  const handleEnterBoughtPrice =
    (order: Exclude<typeof orders, null>['list'][number]) => async () => {
      if (!hasBoughtPrice(order.callData) || !props.swap) return

      try {
        model.editStarted(order.id)

        const [tokenAddress] = order.callData.path.slice(-1)

        const exchange = props.exchangesMap.get(order.callData.exchange)

        const pairs = await tradeApi.pairs([], [order.callData.exchange])

        const pair = pairs.data.list.find(({ pairInfo }) =>
          pairInfo.tokens.some(
            ({ address }) =>
              address.toLowerCase() === tokenAddress.toLowerCase()
          )
        )

        const token = pair?.pairInfo.tokens.find(
          ({ address }) => address.toLowerCase() === tokenAddress.toLowerCase()
        )

        const result = await openTradeEditDialog({
          order,
          exchange,
          boughtToken: token,
        })

        await model.updateOrderFx({
          id: order.id,
          input: {
            callData: {
              boughtPrice: result,
            },
          },
          swap: props.swap,
        })
      } catch (error) {
        console.error(error)
      } finally {
        model.editEnded()
      }
    }

  const user = useStore(authModel.$user)

  const variables = useMemo(() => {
    if (!user || !props.swap) return undefined

    return {
      user: [user.id],
    }
  }, [user, props.swap])

  useOnBillingTransferCreatedSubscription(({ data }) => {
    if (!props.swap) return

    if (data?.onBillingTransferCreated.id) {
      model.fetchOrdersFx({
        filter: {
          status: statuses[currentTab],
        },
        swap: props.swap,
      })
    }
  }, variables)
  useOnBillingTransferUpdatedSubscription(({ data }) => {
    if (!props.swap) return

    if (data?.onBillingTransferUpdated.id) {
      model.fetchOrdersFx({
        filter: {
          status: statuses[currentTab],
        },
        swap: props.swap,
      })
    }
  }, variables)

  return (
    <StickyContainer>
      <div className={clsx(styles.root, props.className)}>
        <Sticky>
          {({ style }) => (
            <Paper radius={8} className={styles.header} style={style}>
              <Typography variant="h4" className={styles.title}>
                Orders
              </Typography>
              <Paper className={styles.tabs} radius={8}>
                {Object.entries(Tabs).map(([key, value]) => (
                  <ButtonBase
                    key={value}
                    className={clsx(
                      styles.tabsItem,
                      value === currentTab && styles.tabsItemActive
                    )}
                    onClick={handleChangeTab(value)}
                  >
                    {key}
                  </ButtonBase>
                ))}
              </Paper>
              {false && (
                <Input placeholder="Search" className={styles.search} />
              )}
              <div className={styles.actions}>
                <ButtonBase
                  onClick={handleUpdatePrice()}
                  className={styles.updatePrice}
                >
                  <Icon width={24} height={24} icon="swap" />
                </ButtonBase>
                {false && (
                  <ButtonBase>
                    <Icon width={24} height={24} icon="arrowUp" />
                  </ButtonBase>
                )}
              </div>
            </Paper>
          )}
        </Sticky>
        <div className={styles.body}>
          <div className={styles.bodyInner}>
            {isEmpty(orders?.list) && !loading && (
              <div className={styles.noOrders}>
                <Icon icon="order" />
                <Typography variant="body3" align="center">
                  Your open orders will be here
                </Typography>
              </div>
            )}
            {!isEmpty(orders?.list) && (
              <>
                <div className={styles.tableHeadings}>
                  <Typography
                    as={ButtonBase}
                    className={styles.tableHeadingsButton}
                  >
                    Pair
                  </Typography>
                  <Typography
                    as={ButtonBase}
                    className={styles.tableHeadingsButton}
                  >
                    Volume
                  </Typography>
                  <Typography
                    as={ButtonBase}
                    className={styles.tableHeadingsButton}
                  >
                    Created Date
                  </Typography>
                  <Typography
                    as={ButtonBase}
                    className={styles.tableHeadingsButton}
                  >
                    Status
                  </Typography>
                  <Typography
                    as={ButtonBase}
                    className={styles.tableHeadingsButton}
                  >
                    Profit/Loss
                  </Typography>
                  <Typography as="div" className={styles.tableHeadingsButton}>
                    Actions
                  </Typography>
                </div>
                {orders?.list.map((order) => {
                  const boughtPrice = hasBoughtPrice(order.callData)
                    ? order.callData.boughtPrice
                    : null

                  const tokensAmountInOut = hasBoughtPrice(order.callData)
                    ? order.callData.amountIn
                    : null

                  const updating =
                    props.updating && updatingOrderId === order.id

                  const deposit = currentWallet
                    ? handleDeposit(order)
                    : handleConnect

                  const price = order.callData.currentPrice

                  return (
                    <TradeOrderDeposit
                      key={order.id}
                      lowBalance={order.owner.billing.balance.lowFeeFunds}
                      onDeposit={deposit}
                      depositing={depositingOrder === order.id}
                    >
                      <div
                        className={clsx(
                          styles.tableRow,
                          updating && styles.tableRowLoader
                        )}
                      >
                        <div className={styles.tableRowInner}>
                          <div>
                            <Typography
                              variant="body2"
                              as="div"
                              className={styles.contractName}
                            >
                              <div className={styles.contractIcons}>
                                {order.tokens.map(({ token }) => (
                                  <React.Fragment key={token.id}>
                                    {token.alias?.logoUrl ? (
                                      <img
                                        src={token.alias?.logoUrl}
                                        className={styles.contractIcon}
                                        alt=""
                                      />
                                    ) : (
                                      <Paper
                                        className={
                                          styles.contractUnknownTokenIcon
                                        }
                                      >
                                        <Icon
                                          icon="unknownNetwork"
                                          width="16"
                                          height="16"
                                        />
                                      </Paper>
                                    )}
                                  </React.Fragment>
                                ))}
                              </div>
                              {order.tokens
                                .map(({ token }) => token.symbol)
                                .join('/')}
                            </Typography>
                            <Typography
                              className={styles.contractAddress}
                              as="div"
                            >
                              {networksConfig[order.owner.network] && (
                                <Icon
                                  icon={
                                    networksConfig[order.owner.network].icon
                                  }
                                  width="22"
                                  height="22"
                                />
                              )}
                              <Link
                                href={buildExplorerUrl({
                                  address: order.owner.address,
                                  network: order.owner.network,
                                })}
                                target="_blank"
                              >
                                {order.owner.name}
                              </Link>
                            </Typography>
                          </div>
                          <div>
                            <div className={styles.contractBalance}>
                              {order.tokens[0].token.alias?.logoUrl ? (
                                <img
                                  src={order.tokens[0].token.alias?.logoUrl}
                                  className={styles.contractBalanceIcon}
                                  alt=""
                                />
                              ) : (
                                <Paper className={styles.contractBalanceIcon}>
                                  <Icon
                                    icon="unknownNetwork"
                                    width="16"
                                    height="16"
                                  />
                                </Paper>
                              )}
                              <Typography className={styles.fs12} as="div">
                                {tokensAmountInOut
                                  ? bignumberUtils.format(tokensAmountInOut)
                                  : '-'}{' '}
                                {order.tokens[0].token.symbol}
                              </Typography>
                            </div>
                          </div>
                          <div>
                            <div className={styles.contractBalance}>
                              <Typography className={styles.fs12} as="div">
                                {dateUtils.format(
                                  order.createdAt,
                                  'DD/MM/YY  h:mma'
                                )}
                              </Typography>
                            </div>
                            <div className={styles.contractBalance}>
                              <Typography className={styles.fs12} as="div">
                                ID {order.number}
                              </Typography>
                            </div>
                          </div>
                          {false && (
                            <TradeStatusChart
                              stopLoss="100"
                              takeProfit="200"
                              buy="150"
                              className={styles.contractStatus}
                            />
                          )}
                          <div>
                            {[
                              SmartTradeOrderStatusEnum.Succeeded,
                              SmartTradeOrderStatusEnum.Canceled,
                            ].includes(order.status) ? (
                              <>
                                {hasBoughtPrice(order.callData) && (
                                  <Button
                                    color="green"
                                    onClick={handleClaim(order)}
                                    loading={claimingOrder === order.id}
                                    disabled={Boolean(
                                      claimingOrder.length &&
                                        claimingOrder !== order.id
                                    )}
                                  >
                                    Claim
                                  </Button>
                                )}
                              </>
                            ) : (
                              order.status
                            )}
                          </div>
                          <div>
                            {boughtPrice ? (
                              <>
                                <div className={styles.contractBalance}>
                                  <Icon
                                    className={styles.contractBalanceIcon}
                                    icon="USDT"
                                  />
                                  <Typography
                                    className={clsx(styles.fs12, {
                                      [styles.positive]: bignumberUtils.gt(
                                        price,
                                        boughtPrice
                                      ),
                                      [styles.negative]: bignumberUtils.lt(
                                        price,
                                        boughtPrice
                                      ),
                                    })}
                                    as="div"
                                  >
                                    {bignumberUtils.format(boughtPrice)}
                                  </Typography>
                                </div>
                                <div className={styles.contractBalance}>
                                  <Typography
                                    className={clsx(styles.fs12, {
                                      [styles.positive]: bignumberUtils.gt(
                                        price,
                                        boughtPrice
                                      ),
                                      [styles.negative]: bignumberUtils.lt(
                                        price,
                                        boughtPrice
                                      ),
                                    })}
                                    as="div"
                                  >
                                    {bignumberUtils.format(boughtPrice)}$ /{' '}
                                    {bignumberUtils.format(boughtPrice)}%
                                  </Typography>
                                </div>
                              </>
                            ) : (
                              <>
                                <Typography
                                  variant="body3"
                                  className={styles.boughtPrice}
                                >
                                  Bought price
                                  <Dropdown
                                    control={
                                      <ButtonBase>
                                        <Icon
                                          icon="question"
                                          width={16}
                                          height={16}
                                        />
                                      </ButtonBase>
                                    }
                                    offset={[0, 8]}
                                  >
                                    <Typography variant="body3">
                                      Enter the Bought price to see your profit
                                    </Typography>
                                  </Dropdown>
                                </Typography>
                                <Button
                                  color="green"
                                  loading={editingOrder === order.id}
                                  onClick={handleEnterBoughtPrice(order)}
                                  size="small"
                                >
                                  Enter
                                </Button>
                              </>
                            )}
                          </div>
                          <div className={styles.contractActions}>
                            <ButtonBase onClick={handleUpdatePrice(order.id)}>
                              <Icon width={16} height={16} icon="swap" />
                            </ButtonBase>
                            <Dropdown
                              control={
                                <ButtonBase>
                                  <Icon
                                    width={16}
                                    height={16}
                                    icon="dots"
                                    className={styles.dots}
                                  />
                                </ButtonBase>
                              }
                            >
                              {(close) => (
                                <ButtonBase
                                  onClick={async () => {
                                    close()

                                    setUpdatingOrderId(order.id)

                                    props.onCancelOrder({
                                      orderNumber: order.number,
                                      id: order.id,
                                    })
                                  }}
                                >
                                  Cancel order
                                </ButtonBase>
                              )}
                            </Dropdown>
                          </div>
                        </div>
                        {updating && (
                          <div className={styles.tableRowInnerLoader}>
                            <Loader height="1em" />
                          </div>
                        )}
                      </div>
                    </TradeOrderDeposit>
                  )
                })}
              </>
            )}
            {loading && (
              <div className={styles.loader}>
                <Loader height="36" />
              </div>
            )}
          </div>
        </div>
      </div>
    </StickyContainer>
  )
}

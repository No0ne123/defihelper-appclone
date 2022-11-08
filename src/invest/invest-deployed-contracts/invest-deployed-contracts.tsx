import { useHistory } from 'react-router-dom'
import clsx from 'clsx'
import isEmpty from 'lodash.isempty'
import { useMemo } from 'react'
import { useInterval, useMedia } from 'react-use'
import { useStore } from 'effector-react'

import { Paper } from '~/common/paper'
import { InvestCarousel } from '~/invest/common/invest-carousel'
import { Typography } from '~/common/typography'
import { Loader } from '~/common/loader'
import {
  useOnTokenMetricUpdatedSubscription,
  useOnWalletMetricUpdatedSubscription,
} from '~/portfolio/common'
import { authModel } from '~/auth'
import { useWalletConnect } from '~/wallets/wallet-connect'
import { bignumberUtils } from '~/common/bignumber-utils'
import { toastsService } from '~/toasts'
import { parseError } from '~/common/parse-error'
import { walletNetworkModel } from '~/wallets/wallet-networks'
import {
  stakingApi,
  StakingAutomatesContractCard,
  StakingErrorDialog,
} from '~/staking/common'
import { useDialog } from '~/common/dialog'
import { switchNetwork } from '~/wallets/common'
import { ConfirmDialog } from '~/common/confirm-dialog'
import { analytics } from '~/analytics'
import { settingsWalletModel } from '~/settings/settings-wallets'
import { InvestStopLossDialog } from '~/invest/common/invest-stop-loss-dialog'
import { paths } from '~/paths'
import { NULL_ADDRESS } from '~/common/constants'
import * as model from '~/staking/staking-automates/staking-automates.model'
import * as automationsListModel from '~/automations/automation-list/automation-list.model'
import * as styles from './invest-deployed-contracts.css'

export type InvestDeployedContractsProps = {
  className?: string
  search: string
}

export const InvestDeployedContracts: React.VFC<InvestDeployedContractsProps> =
  (props) => {
    const history = useHistory()
    const automatesContracts = useStore(model.$automatesContracts)
    const loading = useStore(model.fetchAutomatesContractsFx.pending)
    const user = useStore(authModel.$user)
    const { metrics } = useStore(model.$freshMetrics)

    const [openConfirmDialog] = useDialog(ConfirmDialog)
    const [openErrorDialog] = useDialog(StakingErrorDialog)
    const [openStopLossDialog] = useDialog(InvestStopLossDialog)

    const currentWallet = walletNetworkModel.useWalletNetwork()
    const currentUserWallet = useStore(settingsWalletModel.$currentUserWallet)
    const handleConnect = useWalletConnect()

    const isEmptyContracts = isEmpty(automatesContracts)

    const Component = isEmptyContracts ? Paper : 'div'

    const isDesktop = useMedia('(min-width: 1440px)')
    const isTablet = useMedia('(min-width: 960px)')

    const slidesToShow = useMemo(() => {
      if (isDesktop) {
        return 3
      }

      if (isTablet) {
        return 2
      }

      return 1
    }, [isDesktop, isTablet])

    const handleOnDelete = (contractId: string) => async () => {
      try {
        await openConfirmDialog()

        automationsListModel.deleteContractFx(contractId)
      } catch (error) {
        if (error instanceof Error) {
          console.error(error.message)
        }
      }
    }

    const handleAction =
      (
        contract: typeof automatesContracts[number],
        action: Exclude<model.ActionType, 'migrate'>
      ) =>
      async () => {
        try {
          if (!currentWallet?.account) return
          analytics.log(
            `settings_${action}_network_${currentWallet?.chainId}_click`,
            {
              address: contract.contractWallet?.address,
              network: contract.contractWallet?.network,
              blockchain: 'ethereum',
              provider: currentWallet.provider,
              chainId: String(currentWallet.chainId),
            }
          )

          const adapter = await model.fetchAdapterFx({
            protocolAdapter: contract.protocol.adapter,
            contractAdapter: contract.adapter,
            contractId: contract.id,
            contractAddress: contract.address,
            provider: currentWallet.provider,
            chainId: String(currentWallet.chainId),
            action,
          })

          if (
            !adapter ||
            action === 'run' ||
            action === 'stopLoss' ||
            !currentUserWallet
          )
            return

          const can = await adapter.refund.methods.can()
          if (can instanceof Error) throw can

          analytics.log(
            `settings_${action}_network_${currentWallet?.chainId}_success`,
            {
              address: contract.contractWallet?.address,
              network: contract.contractWallet?.network,
              blockchain: 'ethereum',
              provider: currentWallet.provider,
              chainId: String(currentWallet.chainId),
            }
          )

          history.push(`${paths.invest.detail(contract.contract?.id)}/unstake`)
        } catch (error) {
          const { message } = parseError(error)

          toastsService.error(message)

          console.error(message)
          analytics.log(
            `settings_${action}_network_${currentWallet?.chainId}_failure`,
            {
              address: contract.contractWallet?.address,
              network: contract.contractWallet?.network,
              blockchain: 'ethereum',
            }
          )
        } finally {
          model.reset()
        }
      }
    const handleRunManually =
      (contract: typeof automatesContracts[number]) => async () => {
        try {
          if (
            bignumberUtils.eq(
              contract.contractWallet?.metric.stakedUSD ?? '',
              0
            )
          )
            throw new Error('not enough money')

          if (!currentWallet?.account || !currentUserWallet) return

          const adapter = await model.fetchAdapterFx({
            protocolAdapter: contract.protocol.adapter,
            contractAdapter: contract.adapter,
            contractId: contract.id,
            contractAddress: contract.address,
            provider: currentWallet.provider,
            chainId: String(currentWallet.chainId),
            action: 'run',
          })

          if (!adapter) return

          const tx = await adapter.run()

          const trasactionReceipt = await tx.wait()

          if (contract.contract && contract.contractWallet) {
            model
              .scanWalletMetricFx({
                wallet: contract.contractWallet.id,
                contract: contract.contract.id,
                txId: trasactionReceipt.transactionHash,
              })
              .catch(console.error)

            model
              .scanWalletMetricFx({
                wallet: currentUserWallet.id,
                contract: contract.id,
                txId: trasactionReceipt.transactionHash,
              })
              .catch(console.error)
          }
        } catch (error) {
          const { message } = parseError(error)

          toastsService.error(message)
        } finally {
          model.reset()
        }
      }

    useInterval(
      () => {
        if (currentWallet) {
          model.fetchMetrics(currentWallet)
        }
      },
      currentWallet ? 15000 : null
    )

    const variables = useMemo(() => {
      if (!user) return undefined

      return {
        user: [user.id],
      }
    }, [user])

    useOnWalletMetricUpdatedSubscription(({ data }) => {
      if (data?.onWalletMetricUpdated.id) {
        model.updated()
      }
    }, variables)
    useOnTokenMetricUpdatedSubscription(({ data }) => {
      if (data?.onTokenMetricUpdated.id) {
        model.updated()
      }
    }, variables)

    const handleWrongAddress =
      (contract: typeof automatesContracts[number]) => async () => {
        openErrorDialog({
          contractName: contract.contract?.name ?? '',
          address: contract.wallet.address,
          network: contract.wallet.network,
        }).catch(console.error)
      }

    const handleSwitchNetwork =
      (contract: typeof automatesContracts[number]) => () =>
        switchNetwork(contract.wallet.network).catch(console.error)

    const handleStopLoss =
      (automateContract: typeof automatesContracts[number]) => async () => {
        try {
          if (!automateContract.contract) return
          if (!currentWallet?.account || !user)
            return toastsService.error('wallet is not connected')
          if (!automateContract.contract.automate.autorestake)
            return toastsService.error('adapter not found')

          const stakingAutomatesAdapter = await model.fetchAdapterFx({
            protocolAdapter: automateContract.contract.protocol.adapter,
            contractAdapter: automateContract.contract.automate.autorestake,
            contractId: automateContract.id,
            contractAddress: automateContract.address,
            provider: currentWallet.provider,
            chainId: String(currentWallet.chainId),
            action: 'stopLoss',
          })

          if (!stakingAutomatesAdapter)
            return toastsService.error('adapter not found')

          const tokens = await stakingApi.tokens({
            network: automateContract.contract.network,
            protocol: automateContract.contract.blockchain,
          })

          const res = await openStopLossDialog({
            adapter: stakingAutomatesAdapter.stopLoss,
            mainTokens: automateContract.contract.tokens.stake
              .map((token) => ({
                logoUrl: token.alias?.logoUrl ?? '',
                symbol: token.symbol,
                address: token.address,
              }))
              .filter(({ address }) => address !== NULL_ADDRESS),
            withdrawTokens: tokens.filter(
              ({ address }) => address !== NULL_ADDRESS
            ),
            initialStopLoss: automateContract.stopLoss,
            onDelete: () =>
              automationsListModel.deleteContractFx(automateContract.id),
            onToggleAutoCompound: (active) =>
              model.toggleAutoCompoundFx({ id: automateContract.id, active }),
            autoCompoundActive: automateContract.trigger?.active ?? null,
          })

          if (res.active) {
            await model.enableStopLossFx({
              contract: automateContract.id,
              path: res.path,
              amountOut: res.amountOut,
              amountOutMin: res.amountOutMin,
            })
          } else {
            await model.disableStopLossFx({
              contract: automateContract.id,
            })
          }
        } catch (error) {
          console.error(error)
        } finally {
          model.reset()
        }
      }

    return (
      <Component
        className={clsx(props.className, {
          [styles.empty]: isEmptyContracts && !loading,
        })}
        radius={isEmptyContracts || loading ? 8 : undefined}
      >
        {loading && isEmptyContracts && (
          <div className={clsx(styles.loader, styles.empty)}>
            <Loader height="36" />
          </div>
        )}
        {isEmptyContracts && !loading && (
          <Typography variant="h4">
            You don&apos;t have any investments in DeFiHelper. You can try to
            invest some.
          </Typography>
        )}
        {!isEmptyContracts && (
          <InvestCarousel
            count={automatesContracts.length}
            slidesToShow={slidesToShow}
          >
            {automatesContracts.map((deployedContract) => {
              const connect = handleConnect.bind(null, {
                blockchain: deployedContract.contract?.blockchain,
                network: deployedContract.contract?.network,
              })

              const isNotSameAddresses = (
                String(currentWallet?.chainId) === 'main'
                  ? currentWallet?.account !== deployedContract.wallet.address
                  : currentWallet?.account?.toLowerCase() !==
                    deployedContract.wallet.address
              )
                ? handleWrongAddress(deployedContract)
                : null

              const wrongNetwork =
                String(currentWallet?.chainId) !==
                deployedContract.wallet.network
                  ? handleSwitchNetwork(deployedContract)
                  : null

              const refund =
                wrongNetwork ??
                isNotSameAddresses ??
                handleAction(deployedContract, 'refund')

              const stopLoss =
                wrongNetwork ??
                isNotSameAddresses ??
                handleStopLoss(deployedContract)

              const run =
                wrongNetwork ??
                isNotSameAddresses ??
                handleRunManually(deployedContract)

              return (
                <StakingAutomatesContractCard
                  key={deployedContract.id}
                  restakeAt={deployedContract.restakeAt ?? null}
                  title={deployedContract.contract?.name ?? ''}
                  address={deployedContract.address}
                  network={deployedContract.contract?.network ?? ''}
                  protocol={deployedContract.protocol}
                  automateId={deployedContract.id}
                  contractWalletId={deployedContract.contractWallet?.id}
                  tokensIcons={
                    deployedContract.contract?.tokens.stake.map(
                      ({ alias }) => alias?.logoUrl ?? null
                    ) ?? []
                  }
                  blockchain={deployedContract.contract?.blockchain ?? ''}
                  balance={
                    deployedContract.contractWallet?.metric.stakedUSD ?? ''
                  }
                  apy={deployedContract.contract?.metric.aprYear}
                  apyBoost={deployedContract.contract?.metric.myAPYBoost}
                  onDelete={handleOnDelete(deployedContract.id)}
                  onRefund={currentWallet ? refund : connect}
                  onRun={currentWallet ? run : connect}
                  onStopLoss={currentWallet ? stopLoss : connect}
                  deleting={deployedContract.deleting}
                  running={deployedContract.running}
                  refunding={deployedContract.refunding}
                  contractId={deployedContract.contract?.id}
                  stopLossing={deployedContract.stopLossing}
                  status={deployedContract.stopLoss?.status}
                  stopLossAmountOut={
                    deployedContract.stopLoss?.params?.amountOut
                  }
                  stopLossToken={deployedContract.stopLoss?.outToken?.symbol}
                  error={
                    deployedContract.contractWallet?.billing?.balance
                      ?.lowFeeFunds
                  }
                  freshMetrics={metrics[deployedContract.id]}
                  balanceInvest={bignumberUtils.minus(
                    deployedContract.metric.invest,
                    bignumberUtils.plus(
                      deployedContract.metric.staked,
                      deployedContract.metric.earned
                    )
                  )}
                />
              )
            })}
          </InvestCarousel>
        )}
      </Component>
    )
  }

import { useAsync, useAsyncFn, useAsyncRetry } from 'react-use'
import { useStore } from 'effector-react'
import clsx from 'clsx'
import { useCallback, useState } from 'react'

import { InvestContract } from '~/invest/common/invest.types'
import { walletNetworkModel } from '~/wallets/wallet-networks'
import { authModel } from '~/auth'
import { Loader } from '~/common/loader'
import { settingsWalletModel } from '~/settings/settings-wallets'
import { InvestSell } from '~/invest/invest-sell'
import { InvestUnstakingStepsUnstake } from './invest-unstaking-steps-unstake'
import { InvestUnstakingStepsSuccess } from './invest-unstaking-steps-success'
import * as stakingAutomatesModel from '~/staking/staking-automates/staking-automates.model'
import * as stakingAdaptersModel from '~/staking/staking-adapters/staking-adapters.model'
import * as model from '~/invest/invest-detail/invest-detail.model'
import * as lpTokensModel from '~/lp-tokens/lp-tokens.model'
import * as styles from './invest-unstaking-steps.css'

export type InvestUnstakingStepsProps = {
  className?: string
  contract: InvestContract
}

export const InvestUnstakingSteps: React.VFC<InvestUnstakingStepsProps> = (
  props
) => {
  const user = useStore(authModel.$user)
  const currentWallet = walletNetworkModel.useWalletNetwork()
  const currentUserWallet = useStore(settingsWalletModel.$currentUserWallet)

  const [currentStep, setCurrentStep] = useState(0)

  const [sellToken, setSellToken] = useState('')

  const [withdrawedBalance, setWithdrawedBalance] = useState('0')

  const lp = useAsync(async () => {
    if (!currentWallet?.account || !props.contract.automate.lpTokensManager)
      return

    return stakingAdaptersModel.buyLPFx({
      account: currentWallet.account,
      provider: currentWallet.provider,
      chainId: props.contract.network,
      router: props.contract.automate.lpTokensManager.router,
      pair: props.contract.automate.lpTokensManager.pair,
      network: props.contract.network,
      protocol: props.contract.blockchain,
    })
  }, [props.contract, currentWallet])

  const handleNextStep = useCallback(
    (txId?: string) => {
      setCurrentStep(currentStep + 1)

      if (!txId || !currentUserWallet) return

      stakingAutomatesModel
        .scanWalletMetricFx({
          wallet: currentUserWallet.id,
          contract: props.contract.id,
          txId,
        })
        .catch(console.error)
    },
    [currentStep, currentUserWallet, props.contract.id]
  )

  const adapter = useAsync(async () => {
    if (!user) return

    const deployedContracts =
      await stakingAutomatesModel.fetchAutomatesContractsFx({
        userId: user.id,
      })

    const deployedContract = deployedContracts.list.find(
      ({ contract: deployedStakingContract }) =>
        deployedStakingContract?.id === props.contract.id
    )

    if (
      !currentWallet ||
      !props.contract.automate.autorestake ||
      !deployedContract
    )
      return

    return stakingAutomatesModel.fetchAdapterFx({
      protocolAdapter: props.contract.protocol.adapter,
      contractAdapter: props.contract.automate.autorestake,
      contractId: props.contract.id,
      contractAddress: deployedContract.address,
      provider: currentWallet.provider,
      chainId: String(currentWallet.chainId),
      action: 'migrate',
    })
  }, [currentWallet])

  const balanceOf = useAsyncRetry(async () => {
    return adapter.value?.refund.methods.staked()
  }, [adapter.value])

  const canRefund = useAsyncRetry(async () => {
    return adapter.value?.refund.methods.can()
  }, [adapter.value])

  const [refund, handleRefund] = useAsyncFn(async () => {
    const res = await adapter.value?.refund.methods.refund()

    return res?.tx
      .wait()
      .then(({ transactionHash }) => handleNextStep(transactionHash))
  }, [adapter.value, handleNextStep])

  const steps = [
    <InvestUnstakingStepsUnstake
      key={0}
      loading={refund.loading}
      onSubmit={() => {
        handleRefund()

        if (!currentUserWallet) return

        model.automateInvestRefundFx({
          input: {
            contract: props.contract.id,
            wallet: currentUserWallet.id,
          },
        })
      }}
      contract={props.contract}
    />,
    <InvestSell
      key={3}
      contract={props.contract}
      onSubmit={(values) => {
        handleNextStep(values.tx)

        lpTokensModel.zapFeePayCreateFx(values)
      }}
      adapter={lp.value?.sellLiquidity}
      tokens={lp.value?.tokens}
      onChangeToken={setSellToken}
      onSell={setWithdrawedBalance}
    />,
    <InvestUnstakingStepsSuccess
      key={4}
      contract={props.contract}
      onSubmit={handleNextStep}
      token={sellToken}
      balanceOf={withdrawedBalance}
    />,
  ]

  const currentStepObj = steps[currentStep % steps.length]

  return (
    <div className={clsx(styles.root, props.className)}>
      <div className={styles.content}>
        {canRefund.loading ||
        balanceOf.loading ||
        adapter.loading ||
        lp.loading ? (
          <div className={styles.loader}>
            <Loader height="36" />
          </div>
        ) : (
          currentStepObj
        )}
      </div>
    </div>
  )
}

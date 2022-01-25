import { createDomain, guard, restore, sample } from 'effector-logger/macro'
import { createGate } from 'effector-react'

import {
  ContractListSortInputTypeColumnEnum,
  SortOrderEnum,
  UserRoleEnum,
} from '~/graphql/_generated-types'
import {
  buildAdaptersUrl,
  ConnectParams,
  Contract,
  FreshMetrics,
  stakingApi,
  StakingListPayload,
} from '~/staking/common'
import { createPagination, PaginationState } from '~/common/create-pagination'
import { toastsService } from '~/toasts'
import * as stakingAdaptersModel from '~/staking/staking-adapters/staking-adapters.model'
import { Adapters, loadAdapter } from '~/common/load-adapter'
import { automationApi } from '~/automations/common/automation.api'
import { walletNetworkModel } from '~/wallets/wallet-networks'
import { Wallet } from '~/wallets/common'
import * as settingsWalletModel from '~/settings/settings-wallets/settings-wallets.model'
import { protocolsApi } from '~/protocols/common'
import * as stakingUpdateModel from '~/staking/staking-update/staking-update.model'
import { authModel } from '~/auth'

export const stakingListDomain = createDomain()

const NOT_DELETED = 'Not deleted'
const NOT_CONNECTED = 'Not connected'
const NOT_DISCONNECTED = 'Not disconnected'

type Params = StakingListPayload & PaginationState & { userRole?: UserRoleEnum }

export const stakingUpdateFx = stakingListDomain.createEffect(
  stakingUpdateModel.contractUpdate
)

export const fetchStakingListFx = stakingListDomain.createEffect(
  async (params: Params) => {
    const data = await stakingApi.contractList({
      filter: {
        id: params.protocolId,
      },
      contractFilter: {
        hidden: params.hidden,
      },
      contractPagination: {
        offset: params.offset,
        limit: params.limit,
      },
      contractSort: [
        {
          column:
            params.sortColumn ?? ContractListSortInputTypeColumnEnum.MyStaked,
          order: params.sortOrder ?? SortOrderEnum.Desc,
        },
        {
          column: ContractListSortInputTypeColumnEnum.AprYear,
          order: SortOrderEnum.Desc,
        },
        {
          column: ContractListSortInputTypeColumnEnum.Name,
          order: SortOrderEnum.Asc,
        },
      ],
    })

    const stakingListWithAutostaking = data.contracts.map(async (contract) => {
      let syncedBlock = -1
      let contractAddress
      let scannerContract

      if (params.userRole === UserRoleEnum.Admin) {
        scannerContract = await protocolsApi.scannerGetContract({
          network: contract.network,
          address: contract.address,
        })

        if (scannerContract) {
          const listenedPools = await protocolsApi.scannerGetEventListener({
            id: scannerContract.id,
          })

          syncedBlock = Math.min(...listenedPools.map((v) => v.syncHeight)) || 0
        }
      }

      if (params.protocolAdapter && contract.automate.autorestake) {
        contractAddress = await automationApi
          .getContractAddress({
            protocol: params.protocolAdapter,
            contract: contract.automate.autorestake,
            chainId: contract.network,
          })
          .catch(console.error)
      }

      return {
        ...contract,
        prototypeAddress: contractAddress?.address,
        scannerId: scannerContract?.id,
        syncedBlock,
      }
    })

    return {
      ...data,
      contracts: await Promise.all(stakingListWithAutostaking),
    }
  }
)

export const deleteStakingFx = stakingListDomain.createEffect(
  async (id: string) => {
    const isDeleted = await stakingApi.contractDelete(id)

    if (isDeleted) {
      return id
    }

    throw new Error(NOT_DELETED)
  }
)

export const connectWalletFx = stakingListDomain.createEffect(
  async (params: ConnectParams) => {
    const isConnected = await stakingApi.connectWallet(params)

    if (isConnected) return

    throw new Error(NOT_CONNECTED)
  }
)

export const disconnectWalletFx = stakingListDomain.createEffect(
  async (params: ConnectParams) => {
    const isDisconnected = await stakingApi.disconnectWallet(params)

    if (isDisconnected) return

    throw new Error(NOT_DISCONNECTED)
  }
)

export const fetchConnectedContractsFx = stakingListDomain.createEffect(
  (params: StakingListPayload) =>
    stakingApi.connectedContracts(params.protocolId)
)

export const autostakingStart = stakingListDomain.createEvent<string>()
export const autostakingEnd = stakingListDomain.createEvent<string>()

export const $contractList = stakingListDomain
  .createStore<Contract[]>([])
  .on(fetchStakingListFx.doneData, (_, payload) =>
    payload.contracts.map((contract) => ({
      ...contract,
      type: 'Contract',
    }))
  )
  .on(deleteStakingFx.doneData, (state, payload) => {
    return state.filter(({ id }) => id !== payload)
  })
  .on(autostakingStart, (state, payload) => {
    return state.map((contract) =>
      contract.id === payload
        ? { ...contract, autostakingLoading: true }
        : contract
    )
  })
  .on(autostakingEnd, (state, payload) => {
    return state.map((contract) =>
      contract.id === payload
        ? { ...contract, autostakingLoading: false }
        : contract
    )
  })

export const $contractsListCopies = restore($contractList.updates, []).on(
  stakingUpdateFx.doneData,
  (state, payload) => {
    return state.map((contract) =>
      contract.id === payload?.id
        ? { ...contract, hidden: payload.hidden }
        : contract
    )
  }
)

export const openContract = stakingListDomain.createEvent<string | null>()

export const $openedContract = stakingListDomain
  .createStore<string | null>(null)
  .on(openContract, (_, payload) => payload)
  .on($contractList.updates, (_, contracts) => contracts?.[0]?.address)

export const $connectedContracts = stakingListDomain
  .createStore<Record<string, boolean>>({})
  .on(fetchConnectedContractsFx.doneData, (_, payload) => {
    return payload?.reduce<Record<string, boolean>>((acc, contract) => {
      if (!contract) return acc

      acc[contract.id] = true

      return acc
    }, {})
  })
  .on(connectWalletFx.done, (state, { params }) => ({
    ...state,
    [params.contract]: true,
  }))
  .on(disconnectWalletFx.done, (state, { params }) => ({
    ...state,
    [params.contract]: false,
  }))

guard({
  clock: sample({
    source: [settingsWalletModel.$wallets, $connectedContracts],
    clock: stakingAdaptersModel.stake,
    fn: ([wallets, connectedContracts], params) => {
      const findedWallet = wallets.find((wallet) => {
        const sameAddreses =
          String(params.wallet.chainId) === 'main'
            ? params.wallet.account === wallet.address
            : params.wallet.account?.toLowerCase() === wallet.address

        return sameAddreses && String(params.wallet.chainId) === wallet.network
      })

      return {
        contract: params.contractId,
        wallet: findedWallet?.id,
        connected: Boolean(connectedContracts[params.contractId]),
      }
    },
  }),
  filter: (
    clock
  ): clock is {
    contract: string
    wallet: string
    connected: boolean
  } => Boolean(clock.wallet) && !clock.connected,
  target: connectWalletFx,
})

export const StakingListGate = createGate<StakingListPayload>({
  name: 'StakingListGate',
  domain: stakingListDomain,
})

export const StakingListPagination = createPagination({
  domain: stakingListDomain,
  limit: 20,
})

guard({
  clock: sample({
    source: [
      StakingListPagination.state,
      StakingListGate.state,
      authModel.$user,
    ],
    clock: [
      StakingListGate.open,
      StakingListGate.state.updates,
      StakingListPagination.updates,
      authModel.$user.updates,
    ],
    fn: ([pagination, gate, user]) => ({
      ...pagination,
      ...gate,
      ...{
        userRole: user?.role,
      },
    }),
  }),
  filter: ({ protocolId }) => Boolean(protocolId),
  target: [fetchStakingListFx, fetchConnectedContractsFx],
})

sample({
  clock: fetchStakingListFx.doneData,
  fn: (clock) => clock.pagination,
  target: StakingListPagination.totalElements,
})

export const fetchMetrics = stakingListDomain.createEvent<{
  wallet: Wallet
  protocolAdapter: string
}>()

export const fetchMetricsFx = stakingListDomain.createEffect(
  async (params: {
    contracts: Contract[]
    wallet: Wallet
    protocolAdapter: string
  }) => {
    const networkProvider = walletNetworkModel.getNetwork(
      params.wallet.provider,
      String(params.wallet.chainId)
    )

    const contracts = params.contracts.map(async (contract) => {
      const adapter = await loadAdapter(
        buildAdaptersUrl(params.protocolAdapter)
      )

      if (!params.wallet.account) return null

      const adapterObj = await adapter[
        contract.adapter as keyof Omit<Adapters, 'automates'>
      ](networkProvider, contract.address, {
        blockNumber: 'latest',
        signer: networkProvider?.getSigner(),
      })

      const wallet = await adapterObj.wallet(params.wallet.account)

      return {
        contractId: contract.id,
        tvl: adapterObj.metrics.tvl,
        aprYear: adapterObj.metrics.aprYear,
        myStaked: wallet.metrics.stakingUSD,
        myEarned: wallet.metrics.earnedUSD,
      }
    })

    return (await Promise.all(contracts))
      .filter((contract): contract is FreshMetrics => Boolean(contract))
      .reduce<Record<string, FreshMetrics>>((acc, contract) => {
        acc[contract.contractId] = contract

        return acc
      }, {})
  }
)

export const $freshMetrics = stakingListDomain
  .createStore<Record<string, FreshMetrics>>({})
  .on(fetchMetricsFx.doneData, (_, payload) => payload)

sample({
  source: $contractList,
  clock: fetchMetrics,
  fn: (contracts, { wallet, protocolAdapter }) => ({
    contracts: contracts.filter(
      (contract) =>
        contract.network === String(wallet.chainId) &&
        contract.blockchain === wallet.blockchain
    ),
    wallet,
    protocolAdapter,
  }),
  target: fetchMetricsFx,
})

toastsService.forwardErrors(
  fetchStakingListFx.failData,
  fetchConnectedContractsFx.failData,
  disconnectWalletFx.failData,
  connectWalletFx.failData,
  deleteStakingFx.failData
)

$contractList.reset(StakingListGate.close)
$connectedContracts.reset(StakingListGate.close)

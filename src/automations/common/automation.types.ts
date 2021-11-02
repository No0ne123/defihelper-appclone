import type { Fragment, JsonFragment } from '@ethersproject/abi'

import {
  AutomationTriggerFragmentFragment,
  AutomateConditionType,
  AutomateActionType,
  WalletType,
} from '~/graphql/_generated-types'

export type Trigger = AutomationTriggerFragmentFragment & { deleting?: boolean }

export type Condition = AutomateConditionType & {
  kind: 'condition'
}

export type Action = AutomateActionType & {
  kind: 'action'
}

export type Automates = {
  protocol: string
  contract: string
  contractInterface: string | ReadonlyArray<Fragment | JsonFragment | string>
  address?: string
}

export const isAction = (
  conditioinOrAction?: Condition | Action
): conditioinOrAction is Action => {
  return (
    conditioinOrAction !== undefined && conditioinOrAction.kind === 'action'
  )
}

export const isCondition = (
  conditioinOrAction?: Condition | Action
): conditioinOrAction is Condition => {
  return (
    conditioinOrAction !== undefined && conditioinOrAction.kind === 'condition'
  )
}

export type AutomationNetwork = {
  title: string
  icon: 'ethereumRegular' | 'ethereumRegular' | 'bnbRegular' | 'wavesRegular'
}

export type Wallet = Pick<
  WalletType,
  | 'address'
  | 'id'
  | 'network'
  | 'createdAt'
  | 'blockchain'
  | 'publicKey'
  | 'name'
>

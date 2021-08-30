import { useEffect, useState } from 'react'
import isEmpty from 'lodash.isempty'
import { useForm } from 'react-hook-form'
import { useStore } from 'effector-react'
import { ethers } from 'ethers'

import { AppLayout } from '~/layouts'
import { Button } from '~/common/button'
import { Input } from '~/common/input'
import { useDialog } from '~/common/dialog'
import { GovernanceActionsDialog } from '~/governance/common'
import { Typography } from '~/common/typography'
import {
  GovernanceAction,
  GovernanceActionArguments,
} from '../common/governance.types'
import { ButtonBase } from '~/common/button-base'
import { isEthAddress } from '~/common/is-eth-address'
import { cutAccount } from '~/common/cut-account'
import { walletNetworkModel } from '~/wallets/wallet-networks'
import * as styles from './governance-create.css'
import * as model from './governance-create.model'

export type GovernanceCreateProps = unknown

const joinArguments = (args: GovernanceActionArguments) => {
  return Object.entries(args)
    .map(([param, paramValue]) => {
      const value = isEthAddress(paramValue.value)
        ? cutAccount(paramValue.value)
        : paramValue.value

      return [param, value].join(': ')
    })
    .join(', ')
}

type FormValues = { name: 'string'; description: 'string' }

export const GovernanceCreate: React.VFC<GovernanceCreateProps> = () => {
  const [openGovernanceActionsDialog] = useDialog(GovernanceActionsDialog)

  const loading = useStore(model.proposeFx.pending)

  const { register, handleSubmit, formState } = useForm<FormValues>()

  const [actions, setActions] = useState<GovernanceAction[]>([])

  const { chainId } = walletNetworkModel.useWalletNetwork()
  useEffect(() => {
    setActions([])
  }, [chainId])

  const handleAddAction = async () => {
    try {
      const result = await openGovernanceActionsDialog()

      setActions((previousActions) => [...previousActions, result])
    } catch (error) {
      console.error(error.message)
    }
  }

  const handleDeleteAction = (index: number) => () => {
    setActions((previousActions) => [
      ...previousActions.slice(0, index),
      ...previousActions.slice(index + 1),
    ])
  }

  const handleEditAction =
    (action: GovernanceAction, actionIndex: number) => async () => {
      try {
        const result = await openGovernanceActionsDialog({
          initialAction: action,
        })

        setActions((previousActions) =>
          previousActions.map((previousAction, index) =>
            index === actionIndex ? result : previousAction
          )
        )
      } catch (error) {
        console.error(error.message)
      }
    }

  const handleCreateProposal = (formValues: FormValues) => {
    const description = `#${formValues.name.trim()}\n${formValues.description.trim()}`

    const callDatas = actions.flatMap((action) => {
      const [types, paramValues] = Object.values(action.arguments)
        .filter(({ type }) => type !== 'ether')
        .reduce<[string[], string[]]>(
          ([params, values], { type, value }) => [
            [...params, type],
            [...values, value],
          ],
          [[], []]
        )

      return ethers.utils.defaultAbiCoder.encode(types, paramValues)
    })

    const signatures = actions.map(
      (action) =>
        `${action.method}(${Object.values(action.arguments)
          .filter(({ type }) => type !== 'ether')
          .map(({ type }) => type)
          .join()})`
    )

    const values = actions.flatMap(
      ({ arguments: { payable } }) => payable?.value ?? '0'
    )

    const addresses = actions
      .flatMap((action) => {
        return Object.values(action.arguments).filter(
          (argument) => argument.type === 'address'
        )
      }, [])
      .map(({ value }) => value)

    model.proposeFx({
      addresses,
      values,
      signatures,
      callDatas,
      description,
    })
  }

  return (
    <AppLayout>
      <form
        noValidate
        autoComplete="off"
        className={styles.form}
        onSubmit={handleSubmit(handleCreateProposal)}
      >
        <Input
          type="text"
          label="Enter the name of proposal"
          className={styles.input}
          disabled={loading}
          {...register('name', { required: true })}
        />
        {formState.errors.name?.type === 'required' && (
          <Typography className={styles.error}>required</Typography>
        )}
        {actions.map((action, index) => (
          <div key={String(index)} className={styles.action}>
            <Typography variant="h5" className={styles.actionTitle}>
              {index + 1}: {action.contract}.{action.method}(
              {joinArguments(action.arguments)})
            </Typography>
            <ButtonBase
              className={styles.actionButton}
              onClick={handleEditAction(action, index)}
              disabled={loading}
            >
              Edit
            </ButtonBase>
            <ButtonBase
              className={styles.actionButton}
              onClick={handleDeleteAction(index)}
              disabled={loading}
            >
              Delete
            </ButtonBase>
          </div>
        ))}
        <Button
          className={styles.input}
          onClick={handleAddAction}
          disabled={loading}
        >
          {isEmpty(actions) ? '+ Add Action' : '+ Add another action'}
        </Button>
        <Input
          type="text"
          label="Write a description"
          className={styles.input}
          disabled={loading}
          {...register('description', { required: true })}
        />
        {formState.errors.description?.type === 'required' && (
          <Typography className={styles.error}>required</Typography>
        )}
        <Button type="submit" disabled={loading}>
          Submit proposal
        </Button>
      </form>
    </AppLayout>
  )
}
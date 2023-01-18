import clsx from 'clsx'
import React from 'react'
import { useGate, useStore } from 'effector-react'
import { useHistory, useParams } from 'react-router-dom'

import { AppLayout } from '~/layouts'
import { Typography } from '~/common/typography'
import { MarkdownRender } from '~/common/markdown-render'
import { cutAccount } from '~/common/cut-account'
import { Link } from '~/common/link'
import { buildExplorerUrl } from '~/common/build-explorer-url'
import { config } from '~/config'
import {
  GovProposalStateEnum,
  GovReceiptSupportEnum,
} from '~/api/_generated-types'
import { dateUtils } from '~/common/date-utils'
import {
  GovernanceReasonDialog,
  GovernanceVoteInfo,
  GovProposalStateEnumColors,
} from '~/governance/common'
import { bignumberUtils } from '~/common/bignumber-utils'
import { Button } from '~/common/button'
import { isEthAddress } from '~/common/is-eth-address'
import { Chip } from '~/common/chip'
import { Paper } from '~/common/paper'
import { useDialog } from '~/common/dialog'
import { Head } from '~/common/head'
import { walletNetworkModel } from '~/wallets/wallet-networks'
import { WalletConnect } from '~/wallets/wallet-connect'
import { Loader } from '~/common/loader'
import { GovernanceAttentionDialog } from '~/governance/common/governance-attention-dialog'
import { paths } from '~/paths'
import { WalletSwitchNetwork } from '~/wallets/wallet-switch-network'
import * as model from './governance-detail.model'
import * as listModel from '~/governance/governance-list/governance-list.model'
import * as styles from './governance-detail.css'

export type GovernanceDetailProps = unknown

const QUORUM_VOTES = '400000'

export const GovernanceDetail: React.VFC<GovernanceDetailProps> = () => {
  const params = useParams<{ governanceId: string }>()
  const history = useHistory()

  const [openGovernanceReasonDialog] = useDialog(GovernanceReasonDialog)
  const [openGovernanceAttentionDialog] = useDialog(GovernanceAttentionDialog)

  const loading = useStore(model.fetchGovernanceProposalFx.pending)
  const governanceDetail = useStore(model.$governanceDetail)
  const receipt = useStore(model.$receipt)

  useGate(model.GovernanceDetailGate, params.governanceId)

  const loadingQueue = useStore(model.queueFx.pending)
  const loadingExecute = useStore(model.executeFx.pending)

  const governanceVotes = useStore(model.$governanceVotes)

  const isEnoughGovernanceTokens = bignumberUtils.gte(
    governanceVotes?.votes,
    10000000
  )

  const wallet = walletNetworkModel.useWalletNetwork()

  const handleQueueProposal = async () => {
    try {
      if (!wallet?.account) return

      model.queueFx({
        governanceId: Number(params.governanceId),
        account: wallet.account,
        chainId: String(wallet.chainId),
        provider: wallet.provider,
        cache: false,
      })
    } catch (error) {
      if (error instanceof Error) {
        console.error(error.message)
      }
    }
  }
  const handleExecuteProposal = async () => {
    try {
      if (!wallet?.account) return

      model.executeFx({
        governanceId: Number(params.governanceId),
        account: wallet.account,
        chainId: String(wallet.chainId),
        provider: wallet.provider,
        cache: false,
      })
    } catch (error) {
      if (error instanceof Error) {
        console.error(error.message)
      }
    }
  }

  const loadingCastVote = useStore(model.castVoteFx.pending)

  const handleCastVote = (support: model.CastVotes) => async () => {
    if (!wallet?.account || !wallet.chainId) return

    try {
      const votes = await listModel.fetchGovernanceVotesFx({
        network: Number(wallet.chainId),
        contract: listModel.GOVERNOR_TOKEN,
        wallet: wallet.account,
      })

      if (bignumberUtils.eq(votes?.votes, 0)) {
        await openGovernanceAttentionDialog()
        return
      }
    } catch {
      return
    }

    try {
      let reason: string | undefined

      if (support === model.CastVotes.abstain) {
        reason = await openGovernanceReasonDialog()
      }

      model.castVoteFx({
        proposalId: Number(params.governanceId),
        support,
        reason,
        account: wallet.account,
        chainId: String(wallet.chainId),
        provider: wallet.provider,
        cache: false,
      })
    } catch (error) {
      if (error instanceof Error) {
        console.error(error.message)
      }
    }
  }

  const handleVoteFor = handleCastVote(model.CastVotes.for)
  const handleVoteAbstain = handleCastVote(model.CastVotes.abstain)
  const handleVoteAgainst = handleCastVote(model.CastVotes.against)

  const handleCloneProposal =
    (proposal: Exclude<typeof governanceDetail, null>) => () => {
      history.push(
        `${paths.governance.create}?clone=${btoa(JSON.stringify(proposal))}`
      )
    }

  return (
    <AppLayout title={loading ? 'loading...' : governanceDetail?.title}>
      <Head title={loading ? 'loading...' : governanceDetail?.title} />
      {loading && !governanceDetail && (
        <div className={styles.loader}>
          <Loader height="36" />
        </div>
      )}
      {governanceDetail && (
        <div className={styles.root}>
          <Typography
            align="center"
            variant="h2"
            family="mono"
            transform="uppercase"
          >
            {governanceDetail.title}
          </Typography>
          <Chip
            color={GovProposalStateEnumColors[governanceDetail.state]}
            className={clsx(styles.status, styles.mb32)}
          >
            {governanceDetail.state}
          </Chip>
          {([
            GovProposalStateEnum.Defeated,
            GovProposalStateEnum.Executed,
            GovProposalStateEnum.Expired,
            GovProposalStateEnum.Succeeded,
          ].includes(governanceDetail.state) ||
            (receipt &&
              receipt.hasVoted &&
              [
                GovReceiptSupportEnum.For,
                GovReceiptSupportEnum.Abstain,
                GovReceiptSupportEnum.Against,
              ].includes(receipt.support))) && (
            <div className={clsx(styles.voteInfo, styles.mb32)}>
              <GovernanceVoteInfo
                variant="for"
                active={receipt?.support === GovReceiptSupportEnum.For}
                total={bignumberUtils.total(
                  governanceDetail.abstainVotes,
                  governanceDetail.againstVotes,
                  governanceDetail.forVotes
                )}
                count={governanceDetail.forVotes}
              />
              <GovernanceVoteInfo
                variant="abstain"
                active={receipt?.support === GovReceiptSupportEnum.Abstain}
                total={bignumberUtils.total(
                  governanceDetail.abstainVotes,
                  governanceDetail.againstVotes,
                  governanceDetail.forVotes
                )}
                count={governanceDetail.abstainVotes}
              />
              <GovernanceVoteInfo
                variant="against"
                active={receipt?.support === GovReceiptSupportEnum.Against}
                total={bignumberUtils.total(
                  governanceDetail.abstainVotes,
                  governanceDetail.againstVotes,
                  governanceDetail.forVotes
                )}
                count={governanceDetail.againstVotes}
              />
            </div>
          )}
          {!bignumberUtils.gte(governanceDetail.forVotes, QUORUM_VOTES) && (
            <Typography
              variant="body1"
              align="center"
              as="div"
              className={styles.mb32}
            >
              In order to be applied, the quorum of 4% must be reached
            </Typography>
          )}
          {governanceDetail.state === GovProposalStateEnum.Active &&
            !receipt?.hasVoted && (
              <div className={clsx(styles.voteButtons, styles.mb32)}>
                <WalletConnect
                  fallback={
                    <Button className={styles.voteButton} color="green">
                      Vote for
                    </Button>
                  }
                  blockchain="ethereum"
                  network={config.DEFAULT_CHAIN_ID}
                >
                  <WalletSwitchNetwork>
                    <Button
                      className={styles.voteButton}
                      onClick={handleVoteFor}
                      loading={loadingCastVote}
                      color="green"
                    >
                      Vote for
                    </Button>
                  </WalletSwitchNetwork>
                </WalletConnect>
                <WalletConnect
                  fallback={
                    <Button className={styles.voteButton}>Vote abstain</Button>
                  }
                  blockchain="ethereum"
                  network={config.DEFAULT_CHAIN_ID}
                >
                  <WalletSwitchNetwork>
                    <Button
                      className={styles.voteButton}
                      onClick={handleVoteAbstain}
                      loading={loadingCastVote}
                    >
                      Vote abstain
                    </Button>
                  </WalletSwitchNetwork>
                </WalletConnect>
                <WalletConnect
                  fallback={
                    <Button className={styles.voteButton} color="red">
                      Vote against
                    </Button>
                  }
                  blockchain="ethereum"
                  network={config.DEFAULT_CHAIN_ID}
                >
                  <WalletSwitchNetwork>
                    <Button
                      className={styles.voteButton}
                      onClick={handleVoteAgainst}
                      loading={loadingCastVote}
                      color="red"
                    >
                      Vote against
                    </Button>
                  </WalletSwitchNetwork>
                </WalletConnect>
              </div>
            )}

          {isEnoughGovernanceTokens && (
            <Button
              onClick={handleCloneProposal(governanceDetail)}
              className={styles.mb32}
            >
              clone
            </Button>
          )}
          {governanceDetail.state === GovProposalStateEnum.Succeeded && (
            <WalletConnect
              fallback={<Button className={styles.mb32}>Connect</Button>}
              blockchain="ethereum"
              network={config.DEFAULT_CHAIN_ID}
            >
              <WalletSwitchNetwork>
                <Button
                  onClick={handleQueueProposal}
                  loading={loadingQueue}
                  className={styles.mb32}
                >
                  Queue
                </Button>
              </WalletSwitchNetwork>
            </WalletConnect>
          )}
          {dateUtils.after(
            dateUtils.now(),
            dateUtils.formatUnix(governanceDetail.eta, 'YYYY-MM-DD HH:mm:ss')
          ) &&
            governanceDetail.state === GovProposalStateEnum.Queued && (
              <WalletConnect
                fallback={<Button className={styles.mb32}>Connect</Button>}
                blockchain="ethereum"
                network={config.DEFAULT_CHAIN_ID}
              >
                <WalletSwitchNetwork>
                  <Button
                    onClick={handleExecuteProposal}
                    loading={loadingExecute}
                    className={styles.mb32}
                  >
                    Execute
                  </Button>
                </WalletSwitchNetwork>
              </WalletConnect>
            )}
          {governanceDetail.state === GovProposalStateEnum.Active && (
            <Typography align="center" className={styles.mb32}>
              Voting will end on{' '}
              {dateUtils.format(
                governanceDetail.endVoteDate,
                'HH:mm on MMMM DD, YYYY'
              )}
            </Typography>
          )}
          {governanceDetail.state === GovProposalStateEnum.Queued && (
            <Typography align="center" className={styles.mb32}>
              Can be executed on{' '}
              {dateUtils.formatUnix(
                governanceDetail.eta,
                'HH:mm on MMMM DD, YYYY'
              )}
            </Typography>
          )}
          <Paper radius={8} className={clsx(styles.actions, styles.mb32)}>
            <Typography className={styles.author}>
              Author:{' '}
              <Link
                href={buildExplorerUrl({
                  network: config.DEFAULT_CHAIN_ID,
                  address: governanceDetail.proposer,
                })}
                target="_blank"
                underline="always"
              >
                {cutAccount(governanceDetail.proposer)}
              </Link>
            </Typography>
            <Typography className={styles.author}>
              Status:{' '}
              <Typography
                variant="inherit"
                className={
                  styles.colors[
                    GovProposalStateEnumColors[governanceDetail.state]
                  ]
                }
              >
                {governanceDetail.state}
              </Typography>{' '}
              {!bignumberUtils.gte(governanceDetail.forVotes, QUORUM_VOTES) &&
                '(In order to be applied, the quorum of 4% (40 000 000 DFH) must be reached)'}
            </Typography>
            {governanceDetail.actions.map(
              ({ target, callDatas, signature, id }) => {
                return (
                  <Typography key={id} className={styles.action} as="div">
                    <Link
                      href={buildExplorerUrl({
                        network: config.DEFAULT_CHAIN_ID,
                        address: target,
                      })}
                      target="_blank"
                      underline="always"
                    >
                      {cutAccount(target)}
                    </Link>
                    .{signature}(
                    {callDatas.map((callData, index) => {
                      const call = isEthAddress(callData) ? (
                        <Link
                          href={buildExplorerUrl({
                            network: config.DEFAULT_CHAIN_ID,
                            address: callData,
                          })}
                          target="_blank"
                          underline="always"
                          key={String(index)}
                        >
                          {cutAccount(callData)}
                        </Link>
                      ) : (
                        callData
                      )

                      return (
                        <React.Fragment key={String(index)}>
                          {call}
                          {callDatas.length - 1 === index ? '' : ', '}
                        </React.Fragment>
                      )
                    })}
                    )
                  </Typography>
                )
              }
            )}
          </Paper>
          <MarkdownRender>{governanceDetail.description}</MarkdownRender>
        </div>
      )}
    </AppLayout>
  )
}

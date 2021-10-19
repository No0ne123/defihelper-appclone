import { createDomain, sample, guard } from 'effector-logger/macro'
import { createGate } from 'effector-react'

import { createPagination, PaginationState } from '~/common/create-pagination'
import {
  ProposalCreateInputType,
  ProposalStatusEnum,
  ProposalUpdateMutationVariables,
} from '~/graphql/_generated-types'
import { roadmapApi, Proposal, ProposalsByStatus } from '~/roadmap/common'

const proposalListDomain = createDomain()

export const fetchProposalListFx = proposalListDomain.createEffect(
  ([pagination, status]: [PaginationState, ProposalStatusEnum | undefined]) =>
    roadmapApi.proposalList({
      pagination,
      ...(status ? { filter: { status } } : undefined),
    })
)

export const fetchProposalGroupedListByStatusFx =
  proposalListDomain.createEffect(() =>
    roadmapApi.proposalListByStatus({
      pagination: {
        limit: 10,
      },
    })
  )

const ERROR = 'Not deleted'

export const deleteProposalFx = proposalListDomain.createEffect(
  async (proposal: Proposal) => {
    const isDeleted = await roadmapApi.proposalDelete(proposal.id)

    if (isDeleted) {
      return proposal
    }

    throw new Error(ERROR)
  }
)

export const createProposalFx = proposalListDomain.createEffect(
  async (input: ProposalCreateInputType) => {
    const data = await roadmapApi.proposalCreate({ input })

    if (!data) throw new Error('not created')

    return data
  }
)

export const updateProposalFx = proposalListDomain.createEffect(
  async (
    variables: ProposalUpdateMutationVariables & { proposal: Proposal }
  ) => {
    const data = await roadmapApi.proposalUpdate(variables)

    if (!data) throw new Error('not updated')

    return data
  }
)

const ERROR_MESSAGE = "can't vote"

export const voteProposalFx = proposalListDomain.createEffect(
  async (proposal: Proposal) => {
    const data = await roadmapApi.vote(proposal.id)

    if (!data) throw new Error(ERROR_MESSAGE)

    return {
      proposal,
      data,
    }
  }
)

export const unvoteProposalFx = proposalListDomain.createEffect(
  async (params: { proposal: Proposal; userId?: string }) => {
    const data = await roadmapApi.proposalUnvote(params.proposal.id)

    if (!data) {
      throw new Error(ERROR_MESSAGE)
    }
  }
)

export const $proposalList = proposalListDomain
  .createStore<Proposal[]>([])
  .on(fetchProposalListFx.doneData, (_, payload) => payload.list)
  .on(deleteProposalFx, (state, payload) =>
    state.map((protocol) =>
      protocol.id === payload.id ? { ...protocol, deleting: true } : protocol
    )
  )
  .on(deleteProposalFx.doneData, (state, payload) =>
    state.filter(({ id }) => id !== payload.id)
  )
  .on(voteProposalFx.doneData, (state, payload) =>
    state.map((proposal) =>
      proposal.id === payload.proposal.id
        ? {
            ...proposal,
            votes: {
              list: [...(proposal.votes.list ?? []), payload.data],
            },
          }
        : proposal
    )
  )
  .on(unvoteProposalFx.done, (state, { params }) =>
    state.map((proposal) =>
      proposal.id === params.proposal.id
        ? {
            ...proposal,
            votes: {
              list: proposal.votes.list?.filter(
                (vote) => vote.user.id !== params.userId
              ),
            },
          }
        : proposal
    )
  )
  .on(createProposalFx.doneData, (state, payload) => [...state, payload])
  .on(updateProposalFx, (state, payload) =>
    state.map((proposal) =>
      proposal.id === payload.id ? { ...proposal, updating: true } : proposal
    )
  )
  .on(updateProposalFx.doneData, (state, payload) => {
    const updatedProposalStatus = state.find(
      (proposal) =>
        proposal.id === payload.id && proposal.status !== payload.status
    )

    const newState = state.filter(
      (proposal) => proposal.id !== updatedProposalStatus?.id
    )

    return (updatedProposalStatus ? newState : state).map((proposal) =>
      proposal.id === payload.id ? payload : proposal
    )
  })

export const $groupedProposals = proposalListDomain
  .createStore<ProposalsByStatus>({
    open: undefined,
    in_process: undefined,
    executed: undefined,
    defeated: undefined,
  })
  .on(fetchProposalGroupedListByStatusFx.doneData, (_, payload) => payload)
  .on(createProposalFx.doneData, (state, payload) => ({
    ...state,
    [payload.status]: {
      ...state[payload.status],
      list: [...(state[payload.status]?.list ?? []), payload],
    },
  }))
  .on(updateProposalFx, (state, payload) => ({
    ...state,
    [payload.proposal.status]: {
      ...state[payload.proposal.status],
      [payload.proposal.status]: state[payload.proposal.status]?.list?.map(
        (proposal) =>
          proposal.id === payload.id
            ? { ...proposal, updating: true }
            : proposal
      ),
    },
  }))
  .on(updateProposalFx.done, (state, { params, result }) => {
    const sameStatus = params.proposal.status === result.status

    return {
      ...state,
      ...(!sameStatus
        ? {
            [params.proposal.status]: {
              ...state[params.proposal.status],
              list: state[params.proposal.status]?.list?.filter(
                (proposal) => proposal.id !== params.proposal.id
              ),
              pagination: {
                count:
                  (state[params.proposal.status]?.pagination.count ?? 1) - 1,
              },
            },
          }
        : {}),
      [result.status]: {
        ...state[result.status],
        list: sameStatus
          ? state[result.status]?.list?.map((proposal) =>
              proposal.id === result.id ? result : proposal
            )
          : [result, ...(state[result.status]?.list ?? [])],
        pagination: {
          count: (state[result.status]?.pagination.count ?? 1) + 1,
        },
      },
    }
  })
  .on(deleteProposalFx, (state, payload) => ({
    ...state,
    [payload.status]: {
      ...state[payload.status],
      list: state[payload.status]?.list?.map((protocol) =>
        protocol.id === payload.id ? { ...protocol, deleting: true } : protocol
      ),
    },
  }))
  .on(deleteProposalFx.doneData, (state, payload) => ({
    ...state,
    [payload.status]: {
      ...state[payload.status],
      list: state[payload.status]?.list?.filter(
        (protocol) => protocol.id !== payload.id
      ),
    },
  }))
  .on(voteProposalFx.doneData, (state, payload) => ({
    ...state,
    [payload.proposal.status]: {
      ...state[payload.proposal.status],
      list: state[payload.proposal.status]?.list?.map((proposal) =>
        proposal.id === payload.proposal.id
          ? {
              ...proposal,
              votes: {
                list: [...(proposal.votes.list ?? []), payload.data],
              },
            }
          : proposal
      ),
    },
  }))
  .on(unvoteProposalFx.done, (state, { params }) => ({
    ...state,
    [params.proposal.status]: {
      ...state[params.proposal.status],
      list: state[params.proposal.status]?.list?.map((proposal) =>
        proposal.id === params.proposal.id
          ? {
              ...proposal,
              votes: {
                list: proposal.votes.list?.filter(
                  (vote) => vote.user.id !== params.userId
                ),
              },
            }
          : proposal
      ),
    },
  }))

export const ProposalListGate = createGate<string | null>({
  name: 'ProposalListGate',
  domain: proposalListDomain,
})

export const ProposalListPagination = createPagination({
  domain: proposalListDomain,
})

guard({
  source: [ProposalListPagination.state, ProposalListGate.state],
  clock: [
    ProposalListGate.open,
    ProposalListPagination.updates,
    ProposalListGate.state.updates,
  ],
  filter: (source): source is [PaginationState, ProposalStatusEnum] => {
    const [, status] = source

    const statuses: string[] = [
      ProposalStatusEnum.Open,
      ProposalStatusEnum.Defeated,
      ProposalStatusEnum.Executed,
      ProposalStatusEnum.InProcess,
    ]

    return Boolean(status && statuses.includes(status))
  },
  target: fetchProposalListFx,
})

guard({
  clock: [ProposalListGate.open, ProposalListGate.state.updates],
  filter: (status) => !status,
  target: fetchProposalGroupedListByStatusFx,
})

sample({
  source: fetchProposalListFx.doneData,
  fn: (source) => source.pagination,
  target: ProposalListPagination.totalElements,
})

$proposalList.reset(ProposalListGate.close)
$groupedProposals.reset(ProposalListGate.close)
import { RoadmapCard, Proposal } from '~/roadmap/common'
import { UserType } from '~/graphql/_generated-types'
import * as styles from './roadmap-grid.css'

export type RoadmapGridProps = {
  proposals: Proposal[]
  user?: Pick<UserType, 'id' | 'createdAt' | 'role'> | null
  onEdit: (proposal: Proposal) => void
  onVote: (proposal: Proposal) => void
  onUnvote: (proposal: Proposal) => void
  onDelete: (proposal: Proposal) => void
}

export const RoadmapGrid: React.VFC<RoadmapGridProps> = (props) => {
  const handleVote = (proposal: Proposal) => () => {
    props.onVote(proposal)
  }
  const handleUnvote = (proposal: Proposal) => () => {
    props.onUnvote(proposal)
  }

  const handleDelete = (proposal: Proposal) => async () => {
    props.onDelete(proposal)
  }

  const handleEdit = (proposal: Proposal) => () => {
    props.onEdit(proposal)
  }

  return (
    <div className={styles.root}>
      {props.proposals.map((proposal) => {
        const voted = proposal.votes.list?.some(
          (votes) => votes.user.id === props.user?.id
        )

        return (
          <RoadmapCard
            key={proposal.id}
            {...proposal}
            voted={voted}
            onVote={handleVote(proposal)}
            onUnvote={handleUnvote(proposal)}
            onDelete={handleDelete(proposal)}
            onEdit={handleEdit(proposal)}
          />
        )
      })}
    </div>
  )
}
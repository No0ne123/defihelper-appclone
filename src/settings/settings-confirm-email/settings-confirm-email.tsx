import { Paper } from '@material-ui/core'
import { useStore, useStoreMap } from 'effector-react'
import SentimentVeryDissatisfiedIcon from '@material-ui/icons/SentimentVeryDissatisfied'
import InsertEmoticonIcon from '@material-ui/icons/InsertEmoticon'
import { useParams } from 'react-router-dom'
import { useEffect } from 'react'

import { AppLayout } from '~/layouts'
import * as model from './settings-confirm-email.model'
import * as styles from './settings-confirm-email.css'

export type SettingsConfirmEmailProps = unknown

export const SettingsConfirmEmail: React.VFC<SettingsConfirmEmailProps> =
  () => {
    const params = useParams<{ confirmationCode: string }>()

    const confirmEmail = useStoreMap({
      store: model.$confirmEmail,
      keys: [params.confirmationCode],
      fn: (emails, [confirmationCode]) =>
        emails.find(({ code }) => code === confirmationCode) ?? null,
    })

    const loading = useStore(model.confirmEmailFx.pending)

    useEffect(() => {
      if (confirmEmail === undefined) {
        model.confirmEmailFx({
          confirmationCode: params.confirmationCode,
        })
      }
    }, [confirmEmail, params])

    return (
      <AppLayout>
        {loading && <Paper className={styles.card}>Confirming email...</Paper>}
        {!loading && confirmEmail && confirmEmail.status === true && (
          <Paper className={styles.card}>
            Email has been confirmed <InsertEmoticonIcon />
          </Paper>
        )}
        {!loading && confirmEmail && !confirmEmail.status && (
          <Paper className={styles.card}>
            Email has not been confirmed <SentimentVeryDissatisfiedIcon />
          </Paper>
        )}
      </AppLayout>
    )
  }
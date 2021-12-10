import { useState } from 'react'
import { useAsync, useAsyncRetry } from 'react-use'
import { useForm, Controller } from 'react-hook-form'

import { ButtonBase } from '~/common/button-base'
import { Button } from '~/common/button'
import { Dialog } from '~/common/dialog'
import { DeployStep } from '~/common/load-adapter'
import { NumericalInput } from '~/common/numerical-input'
import { Typography } from '~/common/typography'
import { Loader } from '~/common/loader'
import { Input } from '~/common/input'
import * as styles from './automation-deploy-steps-dialog.css'

export type AutomationDeployStepsDialogProps = {
  onConfirm: (formValues: { address: string; inputs: string[] }) => void
  steps: DeployStep[]
}

export const AutomationDeployStepsDialog: React.FC<AutomationDeployStepsDialogProps> =
  (props) => {
    const { handleSubmit, formState, control } = useForm()
    const [currentStepNumber, setCurrentStepNumber] = useState(0)

    const steps = useAsyncRetry(async () => {
      const res = await Promise.all(
        props.steps.map(async (step) => ({
          ...step,
          info: await step.info(),
        }))
      )

      return res
    }, [props.steps])

    const currentStep = steps.value?.[currentStepNumber]

    const errorValue = useAsync(async () => {
      if (!currentStep) return

      const can = await currentStep.can()

      if (can instanceof Error) throw can
    }, [currentStep])

    const handleSetStep = (stepIndex: number) => () => {
      setCurrentStepNumber(stepIndex)
    }

    const handleOnSubmit = handleSubmit(async (formValues) => {
      if (!currentStep) return

      const values = formValues[currentStep.name]

      try {
        const can = await currentStep.can(...values)

        if (can instanceof Error) return

        const { tx, getAddress } = await currentStep.send(...values)

        await tx.wait()

        props.onConfirm({
          address: await getAddress(),
          inputs: values,
        })
      } catch (error) {
        if (error instanceof Error) {
          console.error(error.message)
        }
      }
    })

    return (
      <Dialog className={styles.root}>
        {steps.loading ? (
          <div className={styles.loader}>
            <Loader height="36" />
          </div>
        ) : (
          <>
            <div className={styles.tabs}>
              {steps.value?.map((step, index) => (
                <Typography
                  variant="body3"
                  transform="uppercase"
                  family="mono"
                  as={ButtonBase}
                  className={styles.title}
                  onClick={handleSetStep(index)}
                  key={step.name}
                >
                  {step.name}
                </Typography>
              ))}
            </div>
            <Typography variant="body2" className={styles.description}>
              {currentStep?.info.description}
            </Typography>
            {currentStep && currentStep.info.inputs && (
              <form
                noValidate
                autoComplete="off"
                onSubmit={handleOnSubmit}
                className={styles.form}
              >
                {currentStep.info.inputs.map((input, index) => {
                  const Component = !input.value ? Input : NumericalInput

                  return (
                    <Controller
                      control={control}
                      key={input.placeholder}
                      name={`${currentStep?.name}.${index}`}
                      render={({ field }) => (
                        <Component
                          label={input.placeholder}
                          disabled={formState.isSubmitting}
                          className={styles.input}
                          {...field}
                          value={field.value || input.value}
                        />
                      )}
                    />
                  )
                })}
                <Button
                  type="submit"
                  loading={formState.isSubmitting}
                  disabled={Boolean(errorValue.error?.message)}
                  className={styles.button}
                >
                  {errorValue.error?.message ?? currentStep.name}
                </Button>
              </form>
            )}
          </>
        )}
      </Dialog>
    )
  }
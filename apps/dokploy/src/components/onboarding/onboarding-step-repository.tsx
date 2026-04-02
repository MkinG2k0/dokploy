import { useTranslations } from 'next-intl'
import { ShowProviderForm } from '../dashboard/application/general/generic/show'
import { ShowGitProviders } from '../dashboard/settings/git/show-git-providers'
import type { OnboardingDraft } from './onboarding-draft-types'

interface OnboardingStepRepositoryProps {
	draft: OnboardingDraft;
	onChange: (patch: Partial<OnboardingDraft>) => void;
}

export const OnboardingStepRepository = ({
	draft: _draft,
	onChange: _onChange,
}: OnboardingStepRepositoryProps) => {
	const t = useTranslations('onboardingWizard')

	return (
		<div className="space-y-6">
			<div>
				<h2 className="font-mono text-base font-semibold">{t('repoTitle')}</h2>
				<p className="text-muted-foreground mt-1 text-sm">{t('repoHint')}</p>
			</div>
			<ShowGitProviders/>
			<ShowProviderForm applicationId={'asd'} onOnboarding/>
		</div>
	)
}

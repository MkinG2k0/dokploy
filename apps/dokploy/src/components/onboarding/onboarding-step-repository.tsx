import { useTranslations } from 'next-intl'
import { useMemo } from 'react'
import {
	BitbucketIcon,
	GithubIcon,
	GitlabIcon,
} from '@/components/icons/data-tools-icons'
import { AddBitbucketProvider } from '@/components/dashboard/settings/git/bitbucket/add-bitbucket-provider'
import { AddGithubProvider } from '@/components/dashboard/settings/git/github/add-github-provider'
import { AddGitlabProvider } from '@/components/dashboard/settings/git/gitlab/add-gitlab-provider'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { api } from '@/utils/api'
import { ProviderSourceTabs } from '../dashboard/application/general/generic/provider-source-tabs'
import { ShowProviderForm } from '../dashboard/application/general/generic/show'
import { ShowGitProviders } from '../dashboard/settings/git/show-git-providers'
import type {
	OnboardingDraft,
	OnboardingGitProvider,
} from './onboarding-draft-types'
import { AddGiteaProvider } from '../dashboard/settings/git/gitea/add-gitea-provider'

interface OnboardingStepRepositoryProps {
	draft: OnboardingDraft;
	onChange: (patch: Partial<OnboardingDraft>) => void;
}

export const OnboardingStepRepository = ({
	draft,
	onChange,
}: OnboardingStepRepositoryProps) => {
	const t = useTranslations('onboardingWizard')

	return (
		<div className="space-y-6">
			<ShowGitProviders/>

			<ShowProviderForm applicationId={'asd'}/>
		</div>
	)
}

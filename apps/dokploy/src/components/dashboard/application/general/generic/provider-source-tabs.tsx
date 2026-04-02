import { UploadCloud } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
	BitbucketIcon,
	DockerIcon,
	GiteaIcon,
	GithubIcon,
	GitIcon,
	GitlabIcon,
} from '@/components/icons/data-tools-icons'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useState } from 'react'
import { api } from '../../../../../utils/api'
import { GitSourceTabPanel } from './git-source-tab-panel'
import { SaveBitbucketProvider } from './save-bitbucket-provider'
import { SaveDockerProvider } from './save-docker-provider'
import { SaveDragNDrop } from './save-drag-n-drop'
import { SaveGitProvider } from './save-git-provider'
import { SaveGiteaProvider } from './save-gitea-provider'
import { SaveGithubProvider } from './save-github-provider'
import { SaveGitlabProvider } from './save-gitlab-provider'

export type ProviderSourceTab =
	| 'github'
	| 'docker'
	| 'git'
	| 'drop'
	| 'gitlab'
	| 'bitbucket'
	| 'gitea';

const tabsTriggerClass =
	'rounded-none border-b-2 gap-2 border-b-transparent data-[state=active]:border-b-2 data-[state=active]:border-b-border'

interface ProviderSourceTabsProps {
	applicationId: string;
}

export const ProviderSourceTabs = ({
	applicationId,

}: ProviderSourceTabsProps) => {
	const {data: application} = api.application.one.useQuery({
		applicationId,
	})
	const [tab, setSab] = useState<ProviderSourceTab>(
		application?.sourceType || 'github',
	)

	const {data: githubProviders, isPending: isLoadingGithub} =
		api.github.githubProviders.useQuery()
	const {data: gitlabProviders, isPending: isLoadingGitlab} =
		api.gitlab.gitlabProviders.useQuery()
	const {data: bitbucketProviders, isPending: isLoadingBitbucket} =
		api.bitbucket.bitbucketProviders.useQuery()
	const {data: giteaProviders, isPending: isLoadingGitea} =
		api.gitea.giteaProviders.useQuery()
	const t = useTranslations('applicationGeneralProvider')

	const handleValueChange = (value: string) => {
		setSab(value as ProviderSourceTab)
	}

	return (
		<Tabs value={tab} className="w-full" onValueChange={handleValueChange}>
			<div className="flex flex-row items-center justify-between w-full overflow-auto">
				<TabsList className="flex gap-4 justify-start bg-transparent">
					<TabsTrigger value="github" className={tabsTriggerClass}>
						<GithubIcon className="size-4 text-current fill-current"/>
						{t('tabs.github')}
					</TabsTrigger>
					<TabsTrigger value="gitlab" className={tabsTriggerClass}>
						<GitlabIcon className="size-4 text-current fill-current"/>
						{t('tabs.gitlab')}
					</TabsTrigger>
					<TabsTrigger value="bitbucket" className={tabsTriggerClass}>
						<BitbucketIcon className="size-4 text-current fill-current"/>
						{t('tabs.bitbucket')}
					</TabsTrigger>
					<TabsTrigger value="gitea" className={tabsTriggerClass}>
						<GiteaIcon className="size-4 text-current fill-current"/>
						{t('tabs.gitea')}
					</TabsTrigger>
					<TabsTrigger value="docker" className={tabsTriggerClass}>
						<DockerIcon className="size-5 text-current"/>
						{t('tabs.docker')}
					</TabsTrigger>
					<TabsTrigger value="git" className={tabsTriggerClass}>
						<GitIcon/>
						{t('tabs.git')}
					</TabsTrigger>
					<TabsTrigger value="drop" className={tabsTriggerClass}>
						<UploadCloud className="size-5 text-current"/>
						{t('tabs.drop')}
					</TabsTrigger>
				</TabsList>
			</div>

			<TabsContent value="github" className="w-full p-2">
				<GitSourceTabPanel
					applicationId={applicationId}
					hasProviders={Boolean(githubProviders?.length)}
					emptyIcon={
						<GithubIcon className="size-8 text-muted-foreground"/>
					}
					configureRichKey="github"
					Form={SaveGithubProvider}
				/>
			</TabsContent>
			<TabsContent value="gitlab" className="w-full p-2">
				<GitSourceTabPanel
					applicationId={applicationId}
					hasProviders={Boolean(gitlabProviders?.length)}
					emptyIcon={
						<GitlabIcon className="size-8 text-muted-foreground"/>
					}
					configureRichKey="gitlab"
					Form={SaveGitlabProvider}
				/>
			</TabsContent>
			<TabsContent value="bitbucket" className="w-full p-2">
				<GitSourceTabPanel
					applicationId={applicationId}
					hasProviders={Boolean(bitbucketProviders?.length)}
					emptyIcon={
						<BitbucketIcon className="size-8 text-muted-foreground"/>
					}
					configureRichKey="bitbucket"
					Form={SaveBitbucketProvider}
				/>
			</TabsContent>
			<TabsContent value="gitea" className="w-full p-2">
				<GitSourceTabPanel
					applicationId={applicationId}
					hasProviders={Boolean(giteaProviders?.length)}
					emptyIcon={<GiteaIcon className="size-8 text-muted-foreground"/>}
					configureRichKey="gitea"
					Form={SaveGiteaProvider}
				/>
			</TabsContent>
			<TabsContent value="docker" className="w-full p-2">
				<SaveDockerProvider applicationId={applicationId}/>
			</TabsContent>
			<TabsContent value="git" className="w-full p-2">
				<SaveGitProvider applicationId={applicationId}/>
			</TabsContent>
			<TabsContent value="drop" className="w-full p-2">
				<SaveDragNDrop applicationId={applicationId}/>
			</TabsContent>
		</Tabs>
	)
}

import { validateRequest } from "@dokploy/server/lib/auth";
import type { GetServerSidePropsContext } from "next";
import type { ReactElement } from "react";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { OnboardingWizardPageLayout } from "@/components/onboarding/onboarding-wizard-page-layout";
import { getOnboardingPageRedirect } from "@/server/utils/onboarding-redirect";

const OnboardingPage = () => {
	return <OnboardingWizard />;
};

export default OnboardingPage;

OnboardingPage.getLayout = (page: ReactElement) => (
	<OnboardingWizardPageLayout>{page}</OnboardingWizardPageLayout>
);

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
	const { user } = await validateRequest(ctx.req);
	if (!user) {
		return {
			redirect: { destination: "/", permanent: false },
		};
	}
	const redirect = await getOnboardingPageRedirect(user.id);
	if (redirect) {
		return { redirect };
	}
	return { props: {} };
}

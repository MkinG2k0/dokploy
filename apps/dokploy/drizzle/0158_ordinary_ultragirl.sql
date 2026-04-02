ALTER TABLE "user" ADD COLUMN "onboardingCompleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "onboardingStep" integer;--> statement-breakpoint
UPDATE "user" SET "onboardingCompleted" = true, "onboardingStep" = NULL;
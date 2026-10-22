ALTER TABLE "exercises" DROP CONSTRAINT "exercises_stage_check";--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_stage_check" CHECK ("exercises"."stage" in (0, 1, 2));
import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// docs/rootkit-api-proposal.md §8 최소 DB 구조

export const submissionStatus = pgEnum("submission_status", [
  "pending",
  "evaluating",
  "completed",
  "failed",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  loginId: text("login_id").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  email: text("email").unique(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const exercises = pgTable(
  "exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stage: smallint("stage").notNull(),
    topic: text("topic"),
    schemaVersion: text("schema_version").notNull(),
    displayJson: jsonb("display_json").notNull(),
    // 서버 전용. 브라우저 응답에 절대 포함하지 않는다.
    gradingContextJson: jsonb("grading_context_json").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("exercises_user_id_idx").on(t.userId, t.createdAt),
    check("exercises_stage_check", sql`${t.stage} in (0, 1, 2)`),
  ],
);

export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    clientRequestId: uuid("client_request_id").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    status: submissionStatus("status").notNull().default("pending"),
    evaluationJson: jsonb("evaluation_json"),
    totalScore: integer("total_score"),
    errorCode: text("error_code"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    evaluatedAt: timestamp("evaluated_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("submissions_exercise_request_uq").on(t.exerciseId, t.clientRequestId),
    index("submissions_exercise_id_idx").on(t.exerciseId, t.createdAt),
  ],
);

import { pgTable, text, timestamp, boolean, integer, jsonb, uuid, decimal, uniqueIndex, index, serial } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  username: text("username").unique(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  usernameIdx: uniqueIndex("unique_username").on(table.username),
  usernameSearchIdx: index("idx_profiles_username").on(table.username),
}));

export const codeSnippets = pgTable("code_snippets", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull().default("Untitled"),
  description: text("description"),
  content: text("content").default(""),
  language: text("language").default("javascript"),
  ownerId: uuid("owner_id"),
  isProtected: boolean("is_protected").default(false),
  isPublic: boolean("is_public").default(false),
  isFeatured: boolean("is_featured").default(false),
  isTemporary: boolean("is_temporary").default(false),
  expiresAt: timestamp("expires_at"),
  shareToken: text("share_token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  expirationIdx: index("idx_code_snippets_expiration").on(table.expiresAt),
}));

export const snippetCollaborators = pgTable("snippet_collaborators", {
  id: uuid("id").primaryKey().defaultRandom(),
  snippetId: uuid("snippet_id").notNull().references(() => codeSnippets.id, { onDelete: "cascade" }),
  userId: uuid("user_id"),
  username: text("username"),
  cursorPosition: jsonb("cursor_position"),
  lastSeen: timestamp("last_seen").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueUserSnippet: uniqueIndex("snippet_collaborators_snippet_id_user_id_key").on(table.snippetId, table.userId),
}));

export const snippetMessages = pgTable("snippet_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  snippetId: uuid("snippet_id").notNull().references(() => codeSnippets.id, { onDelete: "cascade" }),
  userId: text("user_id"),
  username: text("username").notNull(),
  messageType: text("message_type").notNull().default("text"),
  content: text("content"),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  fileType: text("file_type"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  snippetIdIdx: index("idx_snippet_messages_snippet_id").on(table.snippetId),
  createdAtIdx: index("idx_snippet_messages_created_at").on(table.createdAt),
}));

export const snippetCalls = pgTable("snippet_calls", {
  id: uuid("id").primaryKey().defaultRandom(),
  snippetId: uuid("snippet_id").notNull().references(() => codeSnippets.id, { onDelete: "cascade" }),
  roomName: text("room_name").notNull(),
  roomUrl: text("room_url").notNull(),
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
  startedBy: uuid("started_by"),
  isActive: boolean("is_active").default(true),
  participantCount: integer("participant_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  snippetIdIdx: index("idx_snippet_calls_snippet_id").on(table.snippetId),
  activeIdx: index("idx_snippet_calls_active").on(table.snippetId, table.isActive),
}));

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  githubRepoUrl: text("github_repo_url"),
  githubOwner: text("github_owner"),
  githubRepo: text("github_repo"),
  githubBranch: text("github_branch").default("main"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  githubIdx: index("idx_projects_github").on(table.githubRepoUrl),
}));

export const projectFiles = pgTable("project_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  parentFolderId: uuid("parent_folder_id"),
  name: text("name").notNull(),
  type: text("type").notNull(),
  content: text("content"),
  language: text("language"),
  path: text("path").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniquePath: uniqueIndex("project_files_project_id_path_key").on(table.projectId, table.path),
}));

export const projectCollaborators = pgTable("project_collaborators", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull(),
  role: text("role").default("viewer"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueUserProject: uniqueIndex("project_collaborators_project_id_user_id_key").on(table.projectId, table.userId),
}));

export const projectSecrets = pgTable("project_secrets", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  secretKey: text("secret_key").notNull(),
  secretValue: text("secret_value").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueProjectSecret: uniqueIndex("project_secrets_project_id_secret_key_key").on(table.projectId, table.secretKey),
  projectIdIdx: index("idx_project_secrets_project_id").on(table.projectId),
  lookupIdx: index("idx_project_secrets_lookup").on(table.projectId, table.secretKey),
}));

export const codingChallenges = pgTable("coding_challenges", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  difficulty: text("difficulty").notNull(),
  language: text("language").notNull(),
  testCases: jsonb("test_cases").notNull().default(sql`'[]'::jsonb`),
  hints: jsonb("hints").notNull().default(sql`'[]'::jsonb`),
  constraints: text("constraints"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: uuid("created_by"),
}, (table) => ({
  difficultyIdx: index("idx_challenges_difficulty").on(table.difficulty),
  languageIdx: index("idx_challenges_language").on(table.language),
}));

export const challengeSubmissions = pgTable("challenge_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  challengeId: uuid("challenge_id").notNull().references(() => codingChallenges.id, { onDelete: "cascade" }),
  userId: uuid("user_id"),
  sessionId: text("session_id"),
  code: text("code").notNull(),
  language: text("language").notNull(),
  score: integer("score").notNull().default(0),
  rank: text("rank"),
  testResults: jsonb("test_results").default(sql`'[]'::jsonb`),
  feedback: text("feedback"),
  strengths: jsonb("strengths").default(sql`'[]'::jsonb`),
  improvements: jsonb("improvements").default(sql`'[]'::jsonb`),
  executionTimeMs: integer("execution_time_ms"),
  hintsUsed: integer("hints_used").default(0),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("idx_submissions_user").on(table.userId),
  challengeIdx: index("idx_submissions_challenge").on(table.challengeId),
  sessionIdx: index("idx_submissions_session").on(table.sessionId),
}));

export const userPracticeStats = pgTable("user_practice_stats", {
  userId: uuid("user_id").primaryKey(),
  totalChallenges: integer("total_challenges").default(0),
  totalSubmissions: integer("total_submissions").default(0),
  averageScore: decimal("average_score", { precision: 5, scale: 2 }).default("0.00"),
  bestRank: text("best_rank"),
  languagesPracticed: jsonb("languages_practiced").default(sql`'{}'::jsonb`),
  difficultyBreakdown: jsonb("difficulty_breakdown").default(sql`'{}'::jsonb`),
  rankDistribution: jsonb("rank_distribution").default(sql`'{}'::jsonb`),
  totalPoints: integer("total_points").default(0).notNull(),
  currentStreak: integer("current_streak").default(0).notNull(),
  longestStreak: integer("longest_streak").default(0).notNull(),
  lastSubmissionDate: timestamp("last_submission_date", { mode: "date" }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  pointsIdx: index("idx_user_practice_stats_points").on(table.totalPoints),
  userIdIdx: index("idx_user_practice_stats_user_id").on(table.userId),
}));

export const userChallengeHistory = pgTable("user_challenge_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  challengeId: uuid("challenge_id").notNull().references(() => codingChallenges.id, { onDelete: "cascade" }),
  lastAttempted: timestamp("last_attempted").defaultNow(),
  bestScore: integer("best_score").default(0),
  attempts: integer("attempts").default(1),
}, (table) => ({
  uniqueUserChallenge: uniqueIndex("user_challenge_history_user_id_challenge_id_key").on(table.userId, table.challengeId),
  userIdx: index("idx_user_challenge_history_user").on(table.userId),
  challengeIdx: index("idx_user_challenge_history_challenge").on(table.challengeId),
}));

export const verificationTokens = pgTable("verification_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  tokenIdx: index("idx_verification_tokens_token").on(table.token),
  expiresIdx: index("idx_verification_tokens_expires").on(table.expiresAt),
  userIdIdx: index("idx_verification_tokens_user_id").on(table.userId),
}));

export const supportTickets = pgTable("support_tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  type: text("type").notNull(),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("open"),
  priority: text("priority").default("medium"),
  attachments: jsonb("attachments").default(sql`'[]'::jsonb`),
  userEmail: text("user_email").notNull(),
  username: text("username").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("support_tickets_user_id_idx").on(table.userId),
  createdAtIdx: index("support_tickets_created_at_idx").on(table.createdAt),
}));

export const insertProfileSchema = createInsertSchema(profiles).omit({ id: true, createdAt: true });
export const selectProfileSchema = createSelectSchema(profiles);
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profiles.$inferSelect;

export const insertCodeSnippetSchema = createInsertSchema(codeSnippets).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  shareToken: true 
});
export const selectCodeSnippetSchema = createSelectSchema(codeSnippets);
export type InsertCodeSnippet = z.infer<typeof insertCodeSnippetSchema>;
export type CodeSnippet = typeof codeSnippets.$inferSelect;

export const insertSnippetCollaboratorSchema = createInsertSchema(snippetCollaborators).omit({ id: true, createdAt: true, lastSeen: true });
export type InsertSnippetCollaborator = z.infer<typeof insertSnippetCollaboratorSchema>;
export type SnippetCollaborator = typeof snippetCollaborators.$inferSelect;

export const insertSnippetMessageSchema = createInsertSchema(snippetMessages).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSnippetMessage = z.infer<typeof insertSnippetMessageSchema>;
export type SnippetMessage = typeof snippetMessages.$inferSelect;

export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export const insertCodingChallengeSchema = createInsertSchema(codingChallenges).omit({ id: true, createdAt: true });
export type InsertCodingChallenge = z.infer<typeof insertCodingChallengeSchema>;
export type CodingChallenge = typeof codingChallenges.$inferSelect;

export const insertChallengeSubmissionSchema = createInsertSchema(challengeSubmissions).omit({ id: true, submittedAt: true });
export type InsertChallengeSubmission = z.infer<typeof insertChallengeSubmissionSchema>;
export type ChallengeSubmission = typeof challengeSubmissions.$inferSelect;

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;

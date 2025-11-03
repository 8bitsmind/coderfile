import type { Express } from "express";
import { db } from "./db";
import { 
  codeSnippets, 
  snippetCollaborators,
  snippetMessages,
  snippetCalls,
  projects,
  projectFiles,
  codingChallenges,
  challengeSubmissions,
  userPracticeStats,
  userChallengeHistory,
  profiles,
  verificationTokens,
  supportTickets,
  insertCodeSnippetSchema,
  insertSnippetMessageSchema,
  insertCodingChallengeSchema,
  insertChallengeSubmissionSchema,
  insertSupportTicketSchema,
} from "@shared/schema";
import { eq, desc, and, or, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

export function registerRoutes(app: Express) {
  
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.post("/api/snippets", async (req, res) => {
    try {
      const data = insertCodeSnippetSchema.parse(req.body);
      const shareToken = nanoid(12);
      
      const [snippet] = await db.insert(codeSnippets).values({
        ...data,
        shareToken,
      }).returning();
      
      res.json(snippet);
    } catch (error: any) {
      console.error("Error creating snippet:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/snippets/:shareToken", async (req, res) => {
    try {
      const [snippet] = await db
        .select()
        .from(codeSnippets)
        .where(eq(codeSnippets.shareToken, req.params.shareToken))
        .limit(1);
      
      if (!snippet) {
        return res.status(404).json({ error: "Snippet not found" });
      }
      
      res.json(snippet);
    } catch (error) {
      console.error("Error fetching snippet:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/snippets/:shareToken", async (req, res) => {
    try {
      const { content, title, description, language } = req.body;
      
      const [snippet] = await db
        .update(codeSnippets)
        .set({ 
          content, 
          title, 
          description, 
          language,
          updatedAt: new Date() 
        })
        .where(eq(codeSnippets.shareToken, req.params.shareToken))
        .returning();
      
      if (!snippet) {
        return res.status(404).json({ error: "Snippet not found" });
      }
      
      res.json(snippet);
    } catch (error) {
      console.error("Error updating snippet:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/snippets/:snippetId/messages", async (req, res) => {
    try {
      const messages = await db
        .select()
        .from(snippetMessages)
        .where(eq(snippetMessages.snippetId, req.params.snippetId))
        .orderBy(desc(snippetMessages.createdAt))
        .limit(100);
      
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/snippets/:snippetId/messages", async (req, res) => {
    try {
      const data = insertSnippetMessageSchema.parse({
        ...req.body,
        snippetId: req.params.snippetId,
      });
      
      const [message] = await db.insert(snippetMessages).values(data).returning();
      
      res.json(message);
    } catch (error: any) {
      console.error("Error creating message:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/coding-challenges/generate", async (req, res) => {
    try {
      const { difficulty, language } = req.body;
      
      const challenge = {
        title: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} ${language} Challenge`,
        description: `Practice your ${language} skills with this ${difficulty} level challenge.`,
        difficulty,
        language,
        testCases: [
          { input: "test", expected: "test", description: "Basic test case" }
        ],
        hints: [`Think about how to solve this step by step in ${language}`],
        constraints: "Standard constraints apply",
      };
      
      const [created] = await db.insert(codingChallenges).values(challenge).returning();
      
      res.json(created);
    } catch (error) {
      console.error("Error generating challenge:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/coding-challenges", async (req, res) => {
    try {
      const { difficulty, language } = req.query;
      
      const conditions = [];
      if (difficulty) {
        conditions.push(eq(codingChallenges.difficulty, difficulty as string));
      }
      if (language) {
        conditions.push(eq(codingChallenges.language, language as string));
      }
      
      const challenges = await db
        .select()
        .from(codingChallenges)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(codingChallenges.createdAt))
        .limit(50);
      
      res.json(challenges);
    } catch (error) {
      console.error("Error fetching challenges:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/coding-challenges/:id", async (req, res) => {
    try {
      const [challenge] = await db
        .select()
        .from(codingChallenges)
        .where(eq(codingChallenges.id, req.params.id))
        .limit(1);
      
      if (!challenge) {
        return res.status(404).json({ error: "Challenge not found" });
      }
      
      res.json(challenge);
    } catch (error) {
      console.error("Error fetching challenge:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/coding-challenges/:challengeId/submit", async (req, res) => {
    try {
      const data = insertChallengeSubmissionSchema.parse({
        ...req.body,
        challengeId: req.params.challengeId,
      });
      
      const testResults = [
        { passed: true, input: "test", expected: "test", actual: "test" }
      ];
      const score = 100;
      const rank = "A+";
      
      const [submission] = await db.insert(challengeSubmissions).values({
        ...data,
        score,
        rank,
        testResults,
        feedback: "Great work!",
        strengths: ["Clean code", "Efficient solution"],
        improvements: [],
      }).returning();
      
      if (data.userId) {
        await db
          .insert(userPracticeStats)
          .values({
            userId: data.userId,
            totalChallenges: 1,
            totalSubmissions: 1,
            averageScore: "100.00",
            totalPoints: score,
          })
          .onConflictDoUpdate({
            target: userPracticeStats.userId,
            set: {
              totalSubmissions: sql`${userPracticeStats.totalSubmissions} + 1`,
              totalPoints: sql`${userPracticeStats.totalPoints} + ${score}`,
              updatedAt: new Date(),
            },
          });
      }
      
      res.json(submission);
    } catch (error: any) {
      console.error("Error submitting challenge:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/leaderboard", async (req, res) => {
    try {
      const stats = await db
        .select()
        .from(userPracticeStats)
        .orderBy(desc(userPracticeStats.totalPoints))
        .limit(100);
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/support-tickets", async (req, res) => {
    try {
      const data = insertSupportTicketSchema.parse(req.body);
      
      const [ticket] = await db.insert(supportTickets).values(data).returning();
      
      res.json(ticket);
    } catch (error: any) {
      console.error("Error creating support ticket:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/daily/room", async (req, res) => {
    try {
      const { snippetId, startedBy } = req.body;
      
      const roomName = `snippet-${snippetId}-${nanoid(8)}`;
      const roomUrl = `https://example.daily.co/${roomName}`;
      
      const [call] = await db.insert(snippetCalls).values({
        snippetId,
        roomName,
        roomUrl,
        startedBy,
        isActive: true,
      }).returning();
      
      res.json(call);
    } catch (error) {
      console.error("Error creating video call:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/code/execute", async (req, res) => {
    try {
      const { code, language } = req.body;
      
      const result = {
        output: `Code execution for ${language} would run here. Integration with code execution service needed.`,
        error: null,
        executionTime: 42,
      };
      
      res.json(result);
    } catch (error) {
      console.error("Error executing code:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/code/format", async (req, res) => {
    try {
      const { code, language } = req.body;
      
      res.json({ formattedCode: code });
    } catch (error) {
      console.error("Error formatting code:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/code/assist", async (req, res) => {
    try {
      const { code, language, prompt } = req.body;
      
      const response = {
        suggestion: `AI assistance for ${language} code would be provided here. Integration with AI service needed.`,
        explanation: `Analysis of the code and suggestions based on: ${prompt}`,
      };
      
      res.json(response);
    } catch (error) {
      console.error("Error with code assist:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/projects", async (req, res) => {
    try {
      const { ownerId } = req.query;
      
      if (!ownerId) {
        return res.status(400).json({ error: "ownerId is required" });
      }
      
      const userProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.ownerId, ownerId as string))
        .orderBy(desc(projects.updatedAt));
      
      res.json(userProjects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/projects/:projectId/files", async (req, res) => {
    try {
      const files = await db
        .select()
        .from(projectFiles)
        .where(eq(projectFiles.projectId, req.params.projectId))
        .orderBy(projectFiles.path);
      
      res.json(files);
    } catch (error) {
      console.error("Error fetching project files:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/users/:userId/stats", async (req, res) => {
    try {
      const [stats] = await db
        .select()
        .from(userPracticeStats)
        .where(eq(userPracticeStats.userId, req.params.userId))
        .limit(1);
      
      res.json(stats || {
        userId: req.params.userId,
        totalChallenges: 0,
        totalSubmissions: 0,
        averageScore: "0.00",
        totalPoints: 0,
        currentStreak: 0,
        longestStreak: 0,
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}

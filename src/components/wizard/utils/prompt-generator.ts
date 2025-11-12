/**
 * AI Prompt Generation Utilities
 *
 * Generates context-aware prompts for AI assistants to create artifacts.
 * Supports both IDE-based and web-based AI workflows.
 *
 * Based on spec: .kodebase/docs/specs/cli/artifact-wizard.md (lines 619-761)
 */

import path from "node:path";

import { ArtifactService, QueryService } from "@kodebase/artifacts";
import {
  resolveArtifactPaths,
  type TAnyArtifact,
  type TArtifactType,
} from "@kodebase/core";
import yaml from "yaml";

import type { AIEnvironment } from "../types.js";

export interface PromptGenerationOptions {
  artifactType: TArtifactType;
  parentId?: string;
  objective: string;
  aiEnvironment: AIEnvironment;
  baseDir?: string;
}

export interface GeneratedPrompt {
  prompt: string;
  expectedId?: string;
  expectedPath?: string;
}

/**
 * Generate an AI prompt for artifact creation
 */
export async function generateAIPrompt(
  options: PromptGenerationOptions,
): Promise<GeneratedPrompt> {
  const {
    artifactType,
    parentId,
    objective,
    aiEnvironment,
    baseDir = process.cwd(),
  } = options;

  // Load parent artifact context if needed
  let parentArtifact: TAnyArtifact | null = null;
  let parentPath: string | undefined;
  let nextId: string;

  if (parentId) {
    const artifactService = new ArtifactService();
    parentArtifact = await artifactService.getArtifact({
      id: parentId,
      baseDir,
    });

    // Get parent file path
    const { filePath } = await resolveArtifactPaths({ id: parentId, baseDir });
    parentPath = filePath;

    // Determine next available ID
    nextId = await getNextAvailableId(parentId, artifactType, baseDir);
  } else {
    // For initiatives, use next available letter
    nextId = await getNextInitiativeId(baseDir);
  }

  // Get git user info for metadata
  const gitUser = await getGitUser();
  const timestamp = new Date().toISOString();

  // Generate prompt based on AI environment
  if (aiEnvironment === "ide") {
    return {
      prompt: generateIDEPrompt({
        artifactType,
        nextId,
        parentId,
        parentPath,
        objective,
        gitUser,
        baseDir,
      }),
      expectedId: nextId,
      expectedPath: parentPath
        ? path.dirname(parentPath)
        : path.join(baseDir, ".kodebase/artifacts"),
    };
  }

  return {
    prompt: generateWebPrompt({
      artifactType,
      nextId,
      parentArtifact,
      objective,
      gitUser,
      timestamp,
    }),
    expectedId: nextId,
  };
}

/**
 * Generate IDE-based AI prompt (file watcher flow)
 */
function generateIDEPrompt(options: {
  artifactType: TArtifactType;
  nextId: string;
  parentId?: string;
  parentPath?: string;
  objective: string;
  gitUser: string;
  baseDir: string;
}): string {
  const {
    artifactType,
    nextId,
    parentId,
    parentPath,
    objective,
    gitUser,
    baseDir,
  } = options;

  const targetDir = parentPath
    ? path.dirname(parentPath)
    : path.join(baseDir, ".kodebase/artifacts");

  return `Create a Kodebase artifact file with the following details:

**Context:**
- Type: ${artifactType}
- ${parentId ? `Parent: ${parentId}` : "Root artifact (initiative)"}
${parentPath ? `- Parent path: ${parentPath}` : ""}
- Next available ID: ${nextId}
- Target directory: ${targetDir}

**Objective:**
${objective}

**Instructions:**
1. ${parentPath ? `Read the parent artifact at ${parentPath} to understand context` : "This is a root initiative"}
2. Read the artifact schema at packages/core/src/types/artifacts/${artifactType}.ts
3. Check concrete examples by exploring existing ${artifactType} artifacts
4. Generate a complete ${artifactType} artifact following the schema
5. **Create the artifact file** with this structure:
   - metadata.title: Clear, concise title (3-100 chars)
   - metadata.summary: Detailed description based on objective
   - metadata.priority: Assess priority (critical/high/medium/low)
   - metadata.estimation: Estimate effort (XS/S/M/L/XL)${artifactType === "initiative" ? " (skip for initiatives)" : ""}
   - metadata.created_by: "${gitUser}"
   - metadata.assignee: "${gitUser}" (or leave empty)
   - metadata.schema_version: "0.0.1"
   - metadata.artifact_type: "${artifactType}"
   - metadata.relationships: { parent: "${parentId || ""}", blocks: [], blocked_by: [] }
   - metadata.events: [{ event: "draft", timestamp: "<ISO-8601>", actor: "${gitUser}", trigger: "artifact_created" }]
   - content.summary: Detailed description
   - content.deliverables: List of concrete deliverables
   - content.acceptance_criteria: Clear success criteria

**Important:**
- Generate a slug from the title (lowercase, hyphens, no special chars)
- Create the directory: ${targetDir}/${nextId}.<slug>/
- Write the YAML file: ${targetDir}/${nextId}.<slug>/${nextId}.yml
- The wizard will detect the file and show a preview for confirmation

**Output:**
Just confirm when the file is created. The wizard is waiting for the file to appear.`;
}

/**
 * Generate web-based AI prompt (YAML paste flow)
 */
function generateWebPrompt(options: {
  artifactType: TArtifactType;
  nextId: string;
  parentArtifact: TAnyArtifact | null;
  objective: string;
  gitUser: string;
  timestamp: string;
}): string {
  const {
    artifactType,
    nextId,
    parentArtifact,
    objective,
    gitUser,
    timestamp,
  } = options;

  const parentContext = parentArtifact
    ? `\n**Parent Artifact:**\n\`\`\`yaml\n${yaml.stringify(parentArtifact)}\n\`\`\`\n`
    : "";

  return `I'm creating a Kodebase ${artifactType} artifact. Here's what I need:

**Artifact Type:** ${artifactType}
**Artifact ID:** ${nextId}
${parentArtifact ? `**Parent:** ${parentArtifact.metadata.title}` : "**Root artifact** (initiative)"}
${parentContext}
**Objective:**
${objective}

**Schema Structure (${artifactType}):**
\`\`\`yaml
metadata:
  title: string (3-100 chars, required)
  artifact_type: "${artifactType}"
  priority: critical | high | medium | low (required)
  ${artifactType !== "initiative" ? "estimation: XS | S | M | L | XL (required)" : ""}
  created_by: string (required)
  assignee: string (optional)
  schema_version: "0.0.1" (required)
  relationships:
    parent: "${nextId.split(".")[0]}" ${artifactType !== "initiative" ? "(required)" : ""}
    blocks: string[] (optional)
    blocked_by: string[] (optional)
  events:
    - event: draft
      timestamp: ISO 8601 string
      actor: string
      trigger: artifact_created
content:
  summary: string (detailed description)
  deliverables: string[] (concrete deliverables)
  acceptance_criteria: string[] (success criteria)
  notes: object (optional, any additional context)
\`\`\`

**Instructions:**
Generate a complete ${artifactType} artifact in YAML format based on the objective above.
- Use the parent context to inform your choices
- Set realistic priority and estimation
- Create concrete deliverables and acceptance criteria
- Use "${gitUser}" for created_by and assignee
- Set timestamp to "${timestamp}"

**Output Format:**
Return ONLY the YAML artifact (no markdown code blocks, no explanations). Start with "metadata:".`;
}

/**
 * Get next available ID for a child artifact
 */
async function getNextAvailableId(
  parentId: string,
  _artifactType: TArtifactType,
  baseDir: string,
): Promise<string> {
  const queryService = new QueryService(baseDir);

  // List all artifacts to find highest child ID
  const allArtifacts = await queryService.findArtifacts({});

  const prefix = `${parentId}.`;
  const childIds = allArtifacts
    .filter((item) => item.id.startsWith(prefix))
    .map((item) => {
      const suffix = item.id.substring(prefix.length);
      const numMatch = suffix.match(/^(\d+)/);
      return numMatch?.[1] ? Number.parseInt(numMatch[1], 10) : 0;
    });

  const maxId = childIds.length > 0 ? Math.max(...childIds) : 0;
  return `${parentId}.${maxId + 1}`;
}

/**
 * Get next available initiative ID (letter)
 */
async function getNextInitiativeId(baseDir: string): Promise<string> {
  const queryService = new QueryService(baseDir);

  // List all root artifacts (single letter IDs)
  const allArtifacts = await queryService.findArtifacts({});

  const initiativeIds = allArtifacts
    .filter((item) => /^[A-Z]$/.test(item.id))
    .map((item) => item.id.charCodeAt(0));

  if (initiativeIds.length === 0) {
    return "A";
  }

  const maxCharCode = Math.max(...initiativeIds);
  return String.fromCharCode(maxCharCode + 1);
}

/**
 * Get git user info for metadata
 */
async function getGitUser(): Promise<string> {
  try {
    // Try to read from git config
    const { simpleGit } = await import("simple-git");
    const git = simpleGit();

    const name = await git.getConfig("user.name");
    const email = await git.getConfig("user.email");

    if (name.value && email.value) {
      return `${name.value} (${email.value})`;
    }

    if (name.value) {
      return name.value;
    }

    if (email.value) {
      return email.value;
    }
  } catch {
    // Git not available or not configured
  }

  // Fallback to environment user
  return process.env.USER || process.env.USERNAME || "Unknown User";
}

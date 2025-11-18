/**
 * Artifact Tree View Component
 *
 * Displays a hierarchical tree view of artifacts created in the current session.
 * Shows parent-child relationships and artifact titles.
 */

import { CArtifact, type TArtifactType } from "@kodebase/core";
import { Box, Text } from "ink";
import type { FC } from "react";

export interface TreeArtifact {
  id: string;
  title: string;
  type: TArtifactType;
}

export interface ArtifactTreeViewProps {
  /** List of artifacts created in current session */
  artifacts: TreeArtifact[];
}

/**
 * Build hierarchical tree structure from flat list of artifacts
 */
function buildTree(artifacts: TreeArtifact[]): Map<string, TreeArtifact[]> {
  const tree = new Map<string, TreeArtifact[]>();

  // Group by parent ID
  for (const artifact of artifacts) {
    const parts = artifact.id.split(".");

    if (parts.length === 1) {
      // Root initiative
      if (!tree.has("root")) {
        tree.set("root", []);
      }
      tree.get("root")?.push(artifact);
    } else {
      // Child artifact (milestone or issue)
      const parentId = parts.slice(0, -1).join(".");
      if (!tree.has(parentId)) {
        tree.set(parentId, []);
      }
      tree.get(parentId)?.push(artifact);
    }
  }

  return tree;
}

/**
 * Render a single artifact node with its children
 */
const ArtifactNode: FC<{
  artifact: TreeArtifact;
  tree: Map<string, TreeArtifact[]>;
  isLast: boolean;
  prefix: string;
}> = ({ artifact, tree, isLast, prefix }) => {
  const children = tree.get(artifact.id) || [];
  const hasChildren = children.length > 0;

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case CArtifact.INITIATIVE:
        return "📋";
      case CArtifact.MILESTONE:
        return "🎯";
      case CArtifact.ISSUE:
        return "📌";
      default:
        return "•";
    }
  };

  // Get type color
  const getTypeColor = (type: string): "cyan" | "yellow" | "green" => {
    switch (type) {
      case CArtifact.INITIATIVE:
        return "cyan";
      case CArtifact.MILESTONE:
        return "yellow";
      case CArtifact.ISSUE:
        return "green";
      default:
        return "cyan";
    }
  };

  const connector = isLast ? "└─ " : "├─ ";
  const childPrefix = prefix + (isLast ? "   " : "│  ");

  return (
    <>
      <Box>
        <Text color="gray">
          {prefix}
          {connector}
        </Text>
        <Text color={getTypeColor(artifact.type)}>
          {getTypeIcon(artifact.type)}{" "}
        </Text>
        <Text color="white" bold>
          {artifact.id}
        </Text>
        <Text color="gray"> - </Text>
        <Text color="white">{artifact.title}</Text>
      </Box>
      {hasChildren &&
        children.map((child, index) => (
          <ArtifactNode
            key={child.id}
            artifact={child}
            tree={tree}
            isLast={index === children.length - 1}
            prefix={childPrefix}
          />
        ))}
    </>
  );
};

/**
 * Artifact Tree View Component
 */
export const ArtifactTreeView: FC<ArtifactTreeViewProps> = ({ artifacts }) => {
  if (artifacts.length === 0) {
    return null;
  }

  const tree = buildTree(artifacts);
  const rootArtifacts = tree.get("root") || [];

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        Created in this session:
      </Text>
      {rootArtifacts.map((artifact, index) => (
        <ArtifactNode
          key={artifact.id}
          artifact={artifact}
          tree={tree}
          isLast={index === rootArtifacts.length - 1}
          prefix=""
        />
      ))}
    </Box>
  );
};

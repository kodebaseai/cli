/**
 * Tests for artifact-id-parser utilities
 */

import { describe, expect, it } from "vitest";
import { parseArtifactFromPath } from "./artifact-id-parser.js";

describe("parseArtifactFromPath", () => {
  describe("Initiative parsing", () => {
    it("should parse single-letter initiative", () => {
      const result = parseArtifactFromPath(
        ".kodebase/artifacts/F.ide-extension/F.yml",
      );
      expect(result).toEqual({
        id: "F",
        slug: "ide-extension",
        type: "initiative",
      });
    });

    it("should parse two-letter initiative", () => {
      const result = parseArtifactFromPath(
        ".kodebase/artifacts/AB.mobile-app/AB.yml",
      );
      expect(result).toEqual({
        id: "AB",
        slug: "mobile-app",
        type: "initiative",
      });
    });

    it("should parse initiative with hyphenated slug", () => {
      const result = parseArtifactFromPath(
        ".kodebase/artifacts/C.user-authentication-system/C.yml",
      );
      expect(result).toEqual({
        id: "C",
        slug: "user-authentication-system",
        type: "initiative",
      });
    });

    it("should parse initiative from absolute path", () => {
      const result = parseArtifactFromPath(
        "/Users/test/project/.kodebase/artifacts/D.dashboard/D.yml",
      );
      expect(result).toEqual({
        id: "D",
        slug: "dashboard",
        type: "initiative",
      });
    });
  });

  describe("Milestone parsing", () => {
    it("should parse milestone with single-digit number", () => {
      const result = parseArtifactFromPath(
        ".kodebase/artifacts/F.ide-extension/F.1.core-features/F.1.yml",
      );
      expect(result).toEqual({
        id: "F.1",
        slug: "core-features",
        type: "milestone",
      });
    });

    it("should parse milestone with multi-digit number", () => {
      const result = parseArtifactFromPath(
        ".kodebase/artifacts/A.project/A.123.phase-two/A.123.yml",
      );
      expect(result).toEqual({
        id: "A.123",
        slug: "phase-two",
        type: "milestone",
      });
    });

    it("should parse milestone from two-letter initiative", () => {
      const result = parseArtifactFromPath(
        ".kodebase/artifacts/AB.mobile/AB.5.settings/AB.5.yml",
      );
      expect(result).toEqual({
        id: "AB.5",
        slug: "settings",
        type: "milestone",
      });
    });

    it("should parse milestone with hyphenated slug", () => {
      const result = parseArtifactFromPath(
        ".kodebase/artifacts/C.backend/C.2.api-endpoints-v2/C.2.yml",
      );
      expect(result).toEqual({
        id: "C.2",
        slug: "api-endpoints-v2",
        type: "milestone",
      });
    });
  });

  describe("Issue parsing", () => {
    it("should parse issue with slug in filename", () => {
      const result = parseArtifactFromPath(
        ".kodebase/artifacts/F.ide-extension/F.1.core-features/F.1.1.submit-button.yml",
      );
      expect(result).toEqual({
        id: "F.1.1",
        slug: "submit-button",
        type: "issue",
      });
    });

    it("should parse issue with hyphenated slug", () => {
      const result = parseArtifactFromPath(
        ".kodebase/artifacts/A.project/A.1.phase/A.1.2.user-login-form.yml",
      );
      expect(result).toEqual({
        id: "A.1.2",
        slug: "user-login-form",
        type: "issue",
      });
    });

    it("should parse issue with multi-digit numbers", () => {
      const result = parseArtifactFromPath(
        ".kodebase/artifacts/B.app/B.10.feature/B.10.99.final-task.yml",
      );
      expect(result).toEqual({
        id: "B.10.99",
        slug: "final-task",
        type: "issue",
      });
    });

    it("should parse issue from two-letter initiative", () => {
      const result = parseArtifactFromPath(
        ".kodebase/artifacts/CD.system/CD.3.module/CD.3.7.integration-test.yml",
      );
      expect(result).toEqual({
        id: "CD.3.7",
        slug: "integration-test",
        type: "issue",
      });
    });

    it("should parse issue with underscored slug", () => {
      const result = parseArtifactFromPath(
        ".kodebase/artifacts/E.web/E.2.ui/E.2.4.button_component.yml",
      );
      expect(result).toEqual({
        id: "E.2.4",
        slug: "button_component",
        type: "issue",
      });
    });

    it("should handle issue without slug in filename (edge case)", () => {
      // This shouldn't happen with proper scaffolding, but test the fallback
      const result = parseArtifactFromPath(
        ".kodebase/artifacts/F.ide-extension/F.1.core-features/F.1.1.yml",
      );
      expect(result).toEqual({
        id: "F.1.1",
        slug: "F.1.1", // Falls back to ID when no slug in filename
        type: "issue",
      });
    });
  });

  describe("Error handling", () => {
    it("should throw error for invalid filename format", () => {
      expect(() =>
        parseArtifactFromPath(".kodebase/artifacts/invalid/file.yml"),
      ).toThrow("Could not extract artifact ID from filename: file");
    });

    it("should throw error for lowercase ID", () => {
      expect(() =>
        parseArtifactFromPath(".kodebase/artifacts/a.slug/a.yml"),
      ).toThrow("Could not extract artifact ID from filename: a");
    });

    it("should throw error for ID with special characters", () => {
      expect(() =>
        parseArtifactFromPath(".kodebase/artifacts/A-1.slug/A-1.yml"),
      ).toThrow("Could not extract artifact ID from filename: A-1");
    });

    it("should throw error for empty filename", () => {
      expect(() => parseArtifactFromPath(".kodebase/artifacts/.yml")).toThrow(
        "Could not extract artifact ID from filename:",
      );
    });
  });

  describe("Edge cases", () => {
    it("should handle paths with .yml.yml extension", () => {
      const result = parseArtifactFromPath(
        ".kodebase/artifacts/A.test/A.yml.yml",
      );
      expect(result).toEqual({
        id: "A",
        slug: "test",
        type: "initiative",
      });
    });

    it("should parse slug with numbers", () => {
      const result = parseArtifactFromPath(
        ".kodebase/artifacts/A.v2/A.1.api-v2/A.1.1.endpoint-v2.yml",
      );
      expect(result).toEqual({
        id: "A.1.1",
        slug: "endpoint-v2",
        type: "issue",
      });
    });

    it("should handle very long slugs", () => {
      const longSlug =
        "this-is-a-very-long-slug-with-many-words-separated-by-hyphens";
      const result = parseArtifactFromPath(
        `.kodebase/artifacts/A.${longSlug}/A.yml`,
      );
      expect(result).toEqual({
        id: "A",
        slug: longSlug,
        type: "initiative",
      });
    });
  });
});

import { describe, expect, it } from "vitest";
import { createToolkit } from "../src/toolkit.js";

/**
 * The gating flags are the whole basis of the permission system: AgentScope decides
 * whether to stop and ask by reading `requireUserConfirm` off the registered tool. A tool
 * that is silently missing from the toolkit does not fail loudly — it simply stops asking,
 * which looks exactly like the feature working.
 */
describe("createToolkit", () => {
  const toolkit = createToolkit();

  it("registers every built-in tool the agent needs", () => {
    for (const name of ["Read", "Write", "Edit", "Bash", "Glob", "Grep"]) {
      expect(toolkit.tools.some((tool) => tool.name === name)).toBe(true);
    }
  });

  it("gates the tools that can change the machine", () => {
    for (const name of ["Bash", "Write", "Edit"]) {
      expect(toolkit.requireUserConfirm(name)).toBe(true);
    }
  });

  it("does not gate read-only tools, so reading never prompts", () => {
    for (const name of ["Read", "Glob", "Grep"]) {
      expect(toolkit.requireUserConfirm(name)).toBe(false);
    }
  });

  it("does not offer the built-in Skill tool — skills are out of scope", () => {
    expect(toolkit.tools.some((tool) => tool.name === "Skill")).toBe(false);
  });

  it("gives every tool a callable implementation, so none needs external execution", () => {
    for (const tool of toolkit.tools) {
      expect(typeof tool.call).toBe("function");
      expect(toolkit.requireExternalExecution(tool.name)).toBe(false);
    }
  });

  it("exposes every tool to the model with a schema", () => {
    const names = toolkit.getJSONSchemas().map((schema) => schema.function.name);
    expect(names).toContain("Bash");
    expect(names).toContain("Read");
  });
});
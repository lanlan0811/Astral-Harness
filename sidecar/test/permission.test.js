import { describe, expect, it } from "vitest";
import { decide, isGatedTool } from "../src/permission.js";
describe("decide", () => {
    it("allows read-only tools in every mode", () => {
        for (const mode of ["build", "edit", "plan", "yolo"]) {
            for (const tool of ["Read", "Glob", "Grep", "TaskCreate", "TaskList"]) {
                expect(decide(mode, tool)).toBe("allow");
            }
        }
    });
    it("never asks in yolo", () => {
        for (const tool of ["Bash", "Write", "Edit"]) {
            expect(decide("yolo", tool)).toBe("allow");
        }
    });
    it("denies every mutating tool in plan mode", () => {
        for (const tool of ["Bash", "Write", "Edit"]) {
            expect(decide("plan", tool)).toBe("deny");
        }
    });
    it("allows file edits but asks for commands in edit mode", () => {
        expect(decide("edit", "Write")).toBe("allow");
        expect(decide("edit", "Edit")).toBe("allow");
        expect(decide("edit", "Bash")).toBe("ask");
    });
    it("asks for everything mutating in build mode", () => {
        for (const tool of ["Bash", "Write", "Edit"]) {
            expect(decide("build", tool)).toBe("ask");
        }
    });
    it("treats an unknown tool as read-only", () => {
        expect(decide("build", "SomeMcpTool")).toBe("allow");
    });
});
describe("isGatedTool", () => {
    it("gates exactly the tools that can change the machine", () => {
        expect(isGatedTool("Bash")).toBe(true);
        expect(isGatedTool("Write")).toBe(true);
        expect(isGatedTool("Edit")).toBe(true);
        expect(isGatedTool("Read")).toBe(false);
    });
});
//# sourceMappingURL=permission.test.js.map
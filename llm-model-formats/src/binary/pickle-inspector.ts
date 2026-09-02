// ============================================================================
// PYTORCH PICKLE SECURITY INSPECTOR & OPCODE ANALYZER
// ============================================================================

import { SecurityRisk } from "../types.js";

// Dangerous Python modules frequently exploited in malicious pickle payloads
const DANGEROUS_MODULES = [
  "os",
  "subprocess",
  "posix",
  "nt",
  "builtins",
  "sys",
  "socket",
  "pty",
  "shutil",
  "urllib",
  "requests",
  "importlib",
  "commands",
  "winreg",
];

const DANGEROUS_CALLS = [
  "system",
  "popen",
  "spawn",
  "exec",
  "eval",
  "call",
  "check_call",
  "check_output",
  "fork",
  "kill",
  "load_module",
  "run",
];

// Legitimate PyTorch tensor rebuilding functions
const SAFE_PYTORCH_GLOBALS = [
  "torch._utils._rebuild_tensor_v2",
  "torch._utils._rebuild_parameter",
  "torch._utils._rebuild_qtensor",
  "torch.FloatStorage",
  "torch.HalfStorage",
  "torch.BFloat16Storage",
  "torch.IntStorage",
  "torch.LongStorage",
  "torch.ByteStorage",
  "torch.ShortStorage",
  "torch.DoubleStorage",
  "torch.cuda.FloatStorage",
  "collections.OrderedDict",
  "numpy.core.multiarray._reconstruct",
  "numpy.ndarray",
  "numpy.dtype",
];

export interface PickleOpcodeEvent {
  offset: number;
  opcodeName: string;
  argument?: string;
  isSuspicious: boolean;
  explanation?: string;
}

export interface PickleInspectionReport {
  hasPickleMagic: boolean;
  protocolVersion: number;
  securityRisk: SecurityRisk;
  globalImports: Array<{ module: string; name: string; isDangerous: boolean }>;
  dangerousOpcodeEvents: PickleOpcodeEvent[];
  isExploitDetected: boolean;
  exploitExplanation?: string;
  memoryOverheadMultiplier: number; // e.g. 2.5x due to unpickling allocation
  summary: string;
}

// ✅ ATTENTION: Scans a binary buffer for Python Pickle opcodes without executing arbitrary bytecode
export function inspectPickleBuffer(buffer: Uint8Array | ArrayBuffer): PickleInspectionReport {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const globalImports: Array<{ module: string; name: string; isDangerous: boolean }> = [];
  const dangerousOpcodeEvents: PickleOpcodeEvent[] = [];
  let protocolVersion = 0;
  let hasPickleMagic = false;
  let isExploitDetected = false;
  let exploitExplanation: string | undefined = undefined;

  let i = 0;
  while (i < bytes.byteLength) {
    const opcode = bytes[i];
    const offset = i;
    i++;

    // Opcode 0x80: PROTO
    if (opcode === 0x80 && i < bytes.byteLength) {
      hasPickleMagic = true;
      protocolVersion = bytes[i];
      i++;
      continue;
    }

    // Opcode 'c' (0x63): GLOBAL (module\nname\n)
    if (opcode === 0x63) {
      const moduleEnd = findNextNewline(bytes, i);
      if (moduleEnd === -1) break;
      const module = decodeUtf8(bytes.subarray(i, moduleEnd)).trim();
      i = moduleEnd + 1;

      const nameEnd = findNextNewline(bytes, i);
      if (nameEnd === -1) break;
      const name = decodeUtf8(bytes.subarray(i, nameEnd)).trim();
      i = nameEnd + 1;

      const fullName = `${module}.${name}`;
      const isDangerous =
        DANGEROUS_MODULES.includes(module) ||
        DANGEROUS_CALLS.includes(name) ||
        !SAFE_PYTORCH_GLOBALS.includes(fullName);

      globalImports.push({ module, name, isDangerous });

      if (isDangerous) {
        isExploitDetected = true;
        exploitExplanation = `Malicious import detected: '${module}.${name}' allows arbitrary command/code execution upon deserialization.`;
        dangerousOpcodeEvents.push({
          offset,
          opcodeName: "GLOBAL",
          argument: fullName,
          isSuspicious: true,
          explanation: exploitExplanation,
        });
      }
    }

    // Opcode 'R' (0x52): REDUCE (executes callable on stack with arguments)
    if (opcode === 0x52) {
      if (globalImports.some((g) => g.isDangerous)) {
        dangerousOpcodeEvents.push({
          offset,
          opcodeName: "REDUCE",
          argument: "Callable Invocation",
          isSuspicious: true,
          explanation: "REDUCE opcode triggers execution of the dangerous global function.",
        });
      }
    }

    // Opcode 0x93: STACK_GLOBAL (Protocol 4+)
    if (opcode === 0x93) {
      // Stack global resolves top 2 stack strings as module & name
      dangerousOpcodeEvents.push({
        offset,
        opcodeName: "STACK_GLOBAL",
        isSuspicious: false,
        explanation: "Dynamically resolves class/function from stack.",
      });
    }

    // Opcode '.' (0x2E): STOP (end of pickle stream)
    if (opcode === 0x2e) {
      break;
    }
  }

  // ⚠️ CRITICAL: PyTorch pickle unpickling creates substantial duplicate memory in RAM before tensor transfer
  const memoryOverheadMultiplier = isExploitDetected ? 3.0 : 2.2;

  const securityRisk = isExploitDetected
    ? SecurityRisk.ARBITRARY_CODE_EXECUTION
    : hasPickleMagic
    ? SecurityRisk.ARBITRARY_CODE_EXECUTION // Any pickle file inherently carries risk
    : SecurityRisk.SAFE;

  const summary = isExploitDetected
    ? `❌ CRITICAL SECURITY HAZARD: Exploit detected. Importing dangerous module (${exploitExplanation}). DO NOT load this file with torch.load() or pickle.load()!`
    : hasPickleMagic
    ? `⚠️ CAUTION: Valid PyTorch pickle file (Protocol ${protocolVersion}). While safe tensors are referenced, loading pickle files always executes Python VM opcodes. Prefer SafeTensors.`
    : `ℹ️ Non-pickle or raw data payload.`;

  return {
    hasPickleMagic,
    protocolVersion,
    securityRisk,
    globalImports,
    dangerousOpcodeEvents,
    isExploitDetected,
    exploitExplanation,
    memoryOverheadMultiplier,
    summary,
  };
}

// ❌ FORBIDDEN: Synthesizes a mock malicious pickle stream for security testing & validation
export function createMaliciousPicklePayload(command: string): Uint8Array {
  // Protocol 2 pickle stream constructing: os.system(command)
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];

  // 1. \x80\x02 (PROTO 2)
  chunks.push(new Uint8Array([0x80, 0x02]));
  // 2. c (GLOBAL) posix\nsystem\n or os\nsystem\n
  chunks.push(encoder.encode("cos\nsystem\n"));
  // 3. q\x00 (BINPUT 0)
  chunks.push(new Uint8Array([0x71, 0x00]));
  // 4. X (BINUNICODE) len + bytes
  const cmdBytes = encoder.encode(command);
  const lenBuf = new Uint8Array(4);
  new DataView(lenBuf.buffer).setUint32(0, cmdBytes.byteLength, true);
  chunks.push(new Uint8Array([0x58])); // X
  chunks.push(lenBuf);
  chunks.push(cmdBytes);
  // 5. q\x01 (BINPUT 1)
  chunks.push(new Uint8Array([0x71, 0x01]));
  // 6. \x85 (TUPLE1)
  chunks.push(new Uint8Array([0x85]));
  // 7. q\x02 (BINPUT 2)
  chunks.push(new Uint8Array([0x71, 0x02]));
  // 8. R (REDUCE) -> calls os.system(command)
  chunks.push(new Uint8Array([0x52]));
  // 9. q\x03 (BINPUT 3)
  chunks.push(new Uint8Array([0x71, 0x03]));
  // 10. . (STOP)
  chunks.push(new Uint8Array([0x2e]));

  const total = chunks.reduce((acc, c) => acc + c.byteLength, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const c of chunks) {
    out.set(c, pos);
    pos += c.byteLength;
  }
  return out;
}

// Helper: Synthesizes a valid, clean PyTorch OrderedDict state_dict pickle stream
export function createCleanPyTorchPicklePayload(): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];

  // PROTO 2
  chunks.push(new Uint8Array([0x80, 0x02]));
  // GLOBAL collections.OrderedDict
  chunks.push(encoder.encode("ccollections\nOrderedDict\n"));
  // EMPTY_TUPLE () + REDUCE R
  chunks.push(new Uint8Array([0x29, 0x52]));
  // STOP .
  chunks.push(new Uint8Array([0x2e]));

  const total = chunks.reduce((acc, c) => acc + c.byteLength, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const c of chunks) {
    out.set(c, pos);
    pos += c.byteLength;
  }
  return out;
}

function findNextNewline(bytes: Uint8Array, start: number): number {
  for (let i = start; i < bytes.byteLength; i++) {
    if (bytes[i] === 0x0a) return i;
  }
  return -1;
}

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder("utf-8").decode(bytes);
}

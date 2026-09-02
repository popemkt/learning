// ============================================================================
// BINARY UTILITIES: ZERO-COPY BUFFER READER & WRITER
// ============================================================================

import { GGUF_DEFAULT_ALIGNMENT } from "../types.js";

// ✅ ATTENTION: BinaryReader enables sequential, endian-safe parsing of binary containers
export class BinaryReader {
  private view: DataView;
  private offset: number = 0;
  private readonly buffer: Uint8Array;
  private readonly littleEndian: boolean;

  constructor(buffer: Uint8Array | ArrayBuffer, littleEndian: boolean = true) {
    this.buffer = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    this.view = new DataView(
      this.buffer.buffer,
      this.buffer.byteOffset,
      this.buffer.byteLength
    );
    this.littleEndian = littleEndian;
  }

  public get cursor(): number {
    return this.offset;
  }

  public get length(): number {
    return this.buffer.byteLength;
  }

  public remainingBytes(): number {
    return this.buffer.byteLength - this.offset;
  }

  public seek(position: number): void {
    if (position < 0 || position > this.buffer.byteLength) {
      throw new RangeError(
        `Cannot seek to position ${position}. Buffer length is ${this.buffer.byteLength}`
      );
    }
    this.offset = position;
  }

  // 🔒 COMPILE-TIME: Ensure memory alignment for zero-copy mmap tensor reads
  public align(alignment: number = GGUF_DEFAULT_ALIGNMENT): number {
    const remainder = this.offset % alignment;
    if (remainder !== 0) {
      const pad = alignment - remainder;
      this.offset += pad;
    }
    return this.offset;
  }

  public readUint8(): number {
    this.assertBounds(1);
    const val = this.view.getUint8(this.offset);
    this.offset += 1;
    return val;
  }

  public readInt8(): number {
    this.assertBounds(1);
    const val = this.view.getInt8(this.offset);
    this.offset += 1;
    return val;
  }

  public readUint16(): number {
    this.assertBounds(2);
    const val = this.view.getUint16(this.offset, this.littleEndian);
    this.offset += 2;
    return val;
  }

  public readInt16(): number {
    this.assertBounds(2);
    const val = this.view.getInt16(this.offset, this.littleEndian);
    this.offset += 2;
    return val;
  }

  public readUint32(): number {
    this.assertBounds(4);
    const val = this.view.getUint32(this.offset, this.littleEndian);
    this.offset += 4;
    return val;
  }

  public readInt32(): number {
    this.assertBounds(4);
    const val = this.view.getInt32(this.offset, this.littleEndian);
    this.offset += 4;
    return val;
  }

  public readUint64(): bigint {
    this.assertBounds(8);
    const val = this.view.getBigUint64(this.offset, this.littleEndian);
    this.offset += 8;
    return val;
  }

  public readInt64(): bigint {
    this.assertBounds(8);
    const val = this.view.getBigInt64(this.offset, this.littleEndian);
    this.offset += 8;
    return val;
  }

  public readFloat32(): number {
    this.assertBounds(4);
    const val = this.view.getFloat32(this.offset, this.littleEndian);
    this.offset += 4;
    return val;
  }

  public readFloat64(): number {
    this.assertBounds(8);
    const val = this.view.getFloat64(this.offset, this.littleEndian);
    this.offset += 8;
    return val;
  }

  public readBool(): boolean {
    return this.readUint8() !== 0;
  }

  public readBytes(length: number): Uint8Array {
    this.assertBounds(length);
    const slice = this.buffer.subarray(this.offset, this.offset + length);
    this.offset += length;
    return slice;
  }

  public readString(length: number): string {
    const bytes = this.readBytes(length);
    const decoder = new TextDecoder("utf-8");
    return decoder.decode(bytes);
  }

  // ✅ ATTENTION: GGUF strings are prefixed with uint64 length followed by UTF-8 bytes
  public readGGUFString(): string {
    const lenBigInt = this.readUint64();
    if (lenBigInt > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error(`String length ${lenBigInt} exceeds safe JavaScript integer limit`);
    }
    const len = Number(lenBigInt);
    return this.readString(len);
  }

  private assertBounds(bytesNeeded: number): void {
    if (this.offset + bytesNeeded > this.buffer.byteLength) {
      throw new RangeError(
        `Unexpected End Of Buffer: attempted to read ${bytesNeeded} bytes at offset ${this.offset}, total length is ${this.buffer.byteLength}`
      );
    }
  }
}

// ✅ ATTENTION: Dynamic binary writer for synthesizing GGUF and SafeTensors containers
export class BinaryWriter {
  private chunks: Uint8Array[] = [];
  private totalLength: number = 0;
  private readonly littleEndian: boolean;

  constructor(littleEndian: boolean = true) {
    this.littleEndian = littleEndian;
  }

  public get length(): number {
    return this.totalLength;
  }

  public writeUint8(val: number): void {
    const buf = new Uint8Array(1);
    new DataView(buf.buffer).setUint8(0, val);
    this.append(buf);
  }

  public writeInt8(val: number): void {
    const buf = new Uint8Array(1);
    new DataView(buf.buffer).setInt8(0, val);
    this.append(buf);
  }

  public writeUint16(val: number): void {
    const buf = new Uint8Array(2);
    new DataView(buf.buffer).setUint16(0, val, this.littleEndian);
    this.append(buf);
  }

  public writeInt16(val: number): void {
    const buf = new Uint8Array(2);
    new DataView(buf.buffer).setInt16(0, val, this.littleEndian);
    this.append(buf);
  }

  public writeUint32(val: number): void {
    const buf = new Uint8Array(4);
    new DataView(buf.buffer).setUint32(0, val, this.littleEndian);
    this.append(buf);
  }

  public writeInt32(val: number): void {
    const buf = new Uint8Array(4);
    new DataView(buf.buffer).setInt32(0, val, this.littleEndian);
    this.append(buf);
  }

  public writeUint64(val: bigint | number): void {
    const buf = new Uint8Array(8);
    const bigVal = typeof val === "bigint" ? val : BigInt(val);
    new DataView(buf.buffer).setBigUint64(0, bigVal, this.littleEndian);
    this.append(buf);
  }

  public writeInt64(val: bigint | number): void {
    const buf = new Uint8Array(8);
    const bigVal = typeof val === "bigint" ? val : BigInt(val);
    new DataView(buf.buffer).setBigInt64(0, bigVal, this.littleEndian);
    this.append(buf);
  }

  public writeFloat32(val: number): void {
    const buf = new Uint8Array(4);
    new DataView(buf.buffer).setFloat32(0, val, this.littleEndian);
    this.append(buf);
  }

  public writeFloat64(val: number): void {
    const buf = new Uint8Array(8);
    new DataView(buf.buffer).setFloat64(0, val, this.littleEndian);
    this.append(buf);
  }

  public writeBool(val: boolean): void {
    this.writeUint8(val ? 1 : 0);
  }

  public writeBytes(bytes: Uint8Array): void {
    this.append(bytes);
  }

  public writeString(str: string): void {
    const encoder = new TextEncoder();
    this.append(encoder.encode(str));
  }

  // ✅ ATTENTION: Write GGUF length-prefixed string
  public writeGGUFString(str: string): void {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    this.writeUint64(BigInt(bytes.byteLength));
    this.append(bytes);
  }

  // 🔒 COMPILE-TIME: Write alignment padding bytes to satisfy SIMD/GPU cache lines
  public padToAlignment(alignment: number = GGUF_DEFAULT_ALIGNMENT): number {
    const remainder = this.totalLength % alignment;
    if (remainder !== 0) {
      const padBytes = alignment - remainder;
      const padding = new Uint8Array(padBytes);
      this.append(padding);
      return padBytes;
    }
    return 0;
  }

  public toUint8Array(): Uint8Array {
    const result = new Uint8Array(this.totalLength);
    let offset = 0;
    for (const chunk of this.chunks) {
      result.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return result;
  }

  private append(buf: Uint8Array): void {
    this.chunks.push(buf);
    this.totalLength += buf.byteLength;
  }
}

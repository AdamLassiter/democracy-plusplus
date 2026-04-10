declare namespace NodeJS {
  interface ReadableStream {}
  interface WritableStream {}
}

declare const process: {
  stdin: NodeJS.ReadableStream;
  stdout: NodeJS.WritableStream;
};

declare class Buffer extends Uint8Array {}

declare module "node:stream" {
  export class Readable {}
  export class Writable {}
  export class Duplex {}
  export class Transform {}
  export class PassThrough {}
}

declare module "fs/promises" {
  export interface Stats {
    size: number;
  }

  export interface Dirent {
    name: string;
    isDirectory(): boolean;
    isFile(): boolean;
  }

  export interface ReaddirOptions {
    withFileTypes?: boolean;
  }

  const fs: {
    readFile(path: string, encoding: string): Promise<string>;
    writeFile(path: string, data: string | ArrayBuffer | Uint8Array): Promise<void>;
    mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
    access(path: string): Promise<void>;
    stat(path: string): Promise<Stats>;
    readdir(path: string, options?: ReaddirOptions): Promise<Dirent[]>;
    rename(oldPath: string, newPath: string): Promise<void>;
  };

  export default fs;
}

declare module "path" {
  const path: {
    basename(path: string, suffix?: string): string;
    join(...paths: string[]): string;
    resolve(...paths: string[]): string;
  };

  export default path;
}

declare module "readline" {
  export interface Interface {
    question(query: string, callback: (answer: string) => void): void;
    close(): void;
  }

  export function createInterface(options: {
    input: NodeJS.ReadableStream;
    output: NodeJS.WritableStream;
  }): Interface;

  const readline: {
    createInterface: typeof createInterface;
  };

  export default readline;
}

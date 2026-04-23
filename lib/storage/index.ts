import "server-only";

import { localDiskDriver } from "./local-disk";
import type { StorageDriver } from "./types";

/**
 * Active storage driver. Today this is always local disk; Phase 5 selects
 * based on env (e.g. `STORAGE_DRIVER=s3`).
 */
export const storage: StorageDriver = localDiskDriver;

export type { StorageDriver, StoredFile, StorageReadResult } from "./types";

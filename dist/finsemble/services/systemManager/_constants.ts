

import { BootStage } from "./_types"

export const ALL_BOOT_STAGES: BootStage[] = ["microkernel", "kernel", "authentication", "preuser", "earlyuser", "user"];
export const CRITICAL_BOOT_STAGES: BootStage[] = ["microkernel", "kernel", "authentication"];

export const SYSLOG_CHANNEL = "systemManager.systemlog";
export const SHOW_SYSLOG_CHANNEL = "systemManager.showSystemlog";
export const STATUS_CHANNEL_BASE = "systemManager.boot.status";
export const STAGE_CHANNEL = "systemManager.boot.stage";
export const CHECKPOINT_CHANNEL_BASE = "systemManager.checkpoint";


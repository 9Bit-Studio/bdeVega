import { starterAssetPack, type GameSpec } from "./schema.js";

export type EngineCapabilityStatus = "supported" | "unsupported";
export type EngineCapabilityPolicy = "allow" | "warn" | "reject";

export interface EngineCapability {
  description: string;
  policy: EngineCapabilityPolicy;
  status: EngineCapabilityStatus;
}

export type EngineCapabilityId =
  | "checkpoints"
  | "custom-assets"
  | "custom-scripts"
  | "double-jump"
  | "moving-platforms"
  | "trigger-actions";

/**
 * Runtime truth for schema features that can otherwise look playable in JSON.
 * A feature is only marked supported after it has a complete spec-to-runtime
 * slice and automated coverage.
 */
export const engineCapabilityMatrix = Object.freeze({
  "custom-assets": {
    status: "unsupported",
    policy: "reject",
    description: "Only asset packs issued by the trusted asset pipeline may be loaded.",
  },
  checkpoints: {
    status: "supported",
    policy: "allow",
    description: "Checkpoint sensors save a respawn position and restore the player after losing a life.",
  },
  "custom-scripts": {
    status: "unsupported",
    policy: "reject",
    description: "Custom script hooks are not executed by the sandboxed runtime yet.",
  },
  "double-jump": {
    status: "unsupported",
    policy: "warn",
    description: "The controller currently falls back to a single jump.",
  },
  "moving-platforms": {
    status: "supported",
    policy: "allow",
    description: "Kinematic platforms follow a declared offset and duration and transport physics bodies.",
  },
  "trigger-actions": {
    status: "supported",
    policy: "allow",
    description: "Trigger sensors execute bounded declarative score, life, and phase actions.",
  },
} satisfies Record<EngineCapabilityId, EngineCapability>);

export interface EngineCapabilityIssue {
  feature: EngineCapabilityId;
  message: string;
  path: (string | number)[];
  severity: "error" | "warning";
}

function issue(
  feature: EngineCapabilityId,
  path: (string | number)[],
): EngineCapabilityIssue | null {
  const capability = engineCapabilityMatrix[feature];
  if (capability.policy === "allow") return null;
  return {
    feature,
    path,
    severity: capability.policy === "reject" ? "error" : "warning",
    message: capability.description,
  };
}

export function assessEngineCapabilities(spec: GameSpec): EngineCapabilityIssue[] {
  const issues: EngineCapabilityIssue[] = [];
  const add = (feature: EngineCapabilityId, path: (string | number)[]) => {
    const nextIssue = issue(feature, path);
    if (nextIssue) issues.push(nextIssue);
  };

  if (spec.player.doubleJump) add("double-jump", ["player", "doubleJump"]);
  if (spec.scripts.custom.length > 0) add("custom-scripts", ["scripts", "custom"]);
  if (JSON.stringify(spec.assets) !== JSON.stringify(starterAssetPack)) add("custom-assets", ["assets"]);

  return issues;
}

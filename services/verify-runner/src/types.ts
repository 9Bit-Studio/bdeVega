import type { GameExpectations } from "@vega/spec";

export interface VerifyRequest {
  bundleUrl: string;
  expectations: GameExpectations;
}

export interface VerifyFailure {
  type: "browser" | "canvas" | "console" | "expectation" | "fps";
  message: string;
  expectationId?: string;
}

export interface VerifyResult {
  pass: boolean;
  failures: VerifyFailure[];
  metrics: {
    fps: number;
    durationMs: number;
  };
}

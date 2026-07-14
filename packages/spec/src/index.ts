export { gameSpecJsonSchema } from "./json-schema.js";
export {
  assessEngineCapabilities,
  engineCapabilityMatrix,
  type EngineCapability,
  type EngineCapabilityId,
  type EngineCapabilityIssue,
  type EngineCapabilityPolicy,
  type EngineCapabilityStatus,
} from "./capabilities.js";
export {
  GameSpecRepairError,
  validateGameSpecWithRepair,
  type GameSpecRepairContext,
  type GameSpecRepairOptions,
  type GameSpecRepairResult,
} from "./repair.js";
export {
  applyGameSpecPatch,
  gameSpecPatchJsonSchema,
  gameSpecPatchSchema,
  specPatchOperationSchema,
  type GameSpecPatch,
} from "./patch.js";
export {
  controlSchema,
  customScriptSchema,
  expectationAssertionSchema,
  gameExpectationsSchema,
  gameAssetPackSchema,
  gameGenreSchema,
  gameSpecSchema,
  levelEntitySchema,
  triggerActionSchema,
  type CustomScript,
  type ExpectationAssertion,
  type EntityMotion,
  type GameControl,
  type GameAssetPack,
  type GameGenre,
  type GameExpectations,
  type GameSpec,
  type LevelEntity,
  type TriggerAction,
  starterAssetPack,
} from "./schema.js";
export {
  parseGameSpec,
  validateGameSpec,
  validateGameSpecForEngine,
  type EngineGameSpecValidationResult,
  type GameSpecValidationResult,
} from "./validation.js";

export { gameSpecJsonSchema } from "./json-schema.js";
export {
  validateGameSpecWithRepair,
  type GameSpecRepairContext,
  type GameSpecRepairOptions,
  type GameSpecRepairResult,
} from "./repair.js";
export {
  controlSchema,
  customScriptSchema,
  expectationAssertionSchema,
  gameExpectationsSchema,
  gameAssetPackSchema,
  gameGenreSchema,
  gameSpecSchema,
  levelEntitySchema,
  type CustomScript,
  type ExpectationAssertion,
  type GameControl,
  type GameAssetPack,
  type GameGenre,
  type GameExpectations,
  type GameSpec,
  type LevelEntity,
  starterAssetPack,
} from "./schema.js";
export {
  parseGameSpec,
  validateGameSpec,
  type GameSpecValidationResult,
} from "./validation.js";

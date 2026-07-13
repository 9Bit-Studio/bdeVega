export { gameSpecJsonSchema } from "./json-schema.js";
export {
  controlSchema,
  customScriptSchema,
  expectationAssertionSchema,
  gameExpectationsSchema,
  gameGenreSchema,
  gameSpecSchema,
  levelEntitySchema,
  type CustomScript,
  type ExpectationAssertion,
  type GameControl,
  type GameGenre,
  type GameExpectations,
  type GameSpec,
  type LevelEntity,
} from "./schema.js";
export {
  parseGameSpec,
  validateGameSpec,
  type GameSpecValidationResult,
} from "./validation.js";

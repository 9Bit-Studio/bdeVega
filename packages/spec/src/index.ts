export { gameSpecJsonSchema } from "./json-schema.js";
export {
  controlSchema,
  customScriptSchema,
  gameGenreSchema,
  gameSpecSchema,
  levelEntitySchema,
  type CustomScript,
  type GameControl,
  type GameGenre,
  type GameSpec,
  type LevelEntity,
} from "./schema.js";
export {
  parseGameSpec,
  validateGameSpec,
  type GameSpecValidationResult,
} from "./validation.js";

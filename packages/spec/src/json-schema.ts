import { z } from "zod";

import { gameSpecSchema } from "./schema.js";

export const gameSpecJsonSchema = z.toJSONSchema(gameSpecSchema, {
  target: "draft-2020-12",
});

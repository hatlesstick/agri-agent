import { z } from "zod";

const LATIN_LETTER = "A-Za-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u024F\\u1E00-\\u1EFF";
const LATIN_CITY_NAME = new RegExp(`^[${LATIN_LETTER}][${LATIN_LETTER}\\s'’.-]*$`);

export const cityNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(LATIN_CITY_NAME)
  .describe("City name in English, Latin script, base form: Lyon, Munich, Kraków");

export const clockContextSchema = z.object({
  now: z.date(),
});

export type ClockContext = z.infer<typeof clockContextSchema>;

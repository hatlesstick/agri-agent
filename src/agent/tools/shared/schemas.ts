import { z } from "zod";

const LATIN_CITY_NAME = /^\p{Script=Latin}[\p{Script=Latin}\s'’.-]*$/u;

export const cityNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(LATIN_CITY_NAME)
  .describe("City name in English, Latin script, base form: Lyon, Munich, Kraków");

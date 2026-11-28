import type { UIMessage } from "ai";
import type { GetWeatherInput, GetWeatherOutput } from "@/contracts/tools/get-weather";
import type {
  FieldInput,
  GetFieldOutput,
  ListFieldsOutput,
  ProposeChangeFieldOutput,
  ProposeDeleteFieldInput,
  ProposeSaveFieldOutput,
  ProposeUpdateFieldInput,
} from "@/contracts/tools/fields";
import type { SearchDocsInput, SearchDocsOutput } from "@/contracts/tools/search-docs";
import type { SprayOutlookInput, SprayOutlookOutput } from "@/contracts/tools/spray-outlook";
import type { SprayWindowInput, SprayWindowOutput } from "@/contracts/tools/spray-window";

export type AgriChatTools = {
  getWeather: { input: GetWeatherInput; output: GetWeatherOutput };
  sprayWindow: { input: SprayWindowInput; output: SprayWindowOutput };
  sprayOutlook: { input: SprayOutlookInput; output: SprayOutlookOutput };
  searchDocs: { input: SearchDocsInput; output: SearchDocsOutput };
  listFields: { input: Record<string, never>; output: ListFieldsOutput };
  getField: { input: { id: string }; output: GetFieldOutput };
  proposeSaveField: { input: FieldInput; output: ProposeSaveFieldOutput };
  proposeUpdateField: { input: ProposeUpdateFieldInput; output: ProposeChangeFieldOutput };
  proposeDeleteField: { input: ProposeDeleteFieldInput; output: ProposeChangeFieldOutput };
};

export type AgriChatMessage = UIMessage<unknown, never, AgriChatTools>;

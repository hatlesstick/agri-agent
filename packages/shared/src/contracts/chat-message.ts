import type { UIMessage } from "ai";
import type { GetWeatherInput, GetWeatherOutput } from "@/contracts/tools/get-weather";
import type { SearchDocsInput, SearchDocsOutput } from "@/contracts/tools/search-docs";
import type { SprayOutlookInput, SprayOutlookOutput } from "@/contracts/tools/spray-outlook";
import type { SprayWindowInput, SprayWindowOutput } from "@/contracts/tools/spray-window";

export type AgriChatTools = {
  getWeather: { input: GetWeatherInput; output: GetWeatherOutput };
  sprayWindow: { input: SprayWindowInput; output: SprayWindowOutput };
  sprayOutlook: { input: SprayOutlookInput; output: SprayOutlookOutput };
  searchDocs: { input: SearchDocsInput; output: SearchDocsOutput };
};

export type AgriChatMessage = UIMessage<unknown, never, AgriChatTools>;

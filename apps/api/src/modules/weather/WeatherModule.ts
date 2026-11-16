import { Module } from "@nestjs/common";
import { CACHE_STORE, type CacheStore } from "@/common/cache";
import { API_ENV, type ApiEnv } from "@/config";
import { OpenMeteoClient, openMeteoUrls } from "@/modules/weather/adapters/OpenMeteoClient";
import { WEATHER_PORT } from "@/modules/weather/weather.tokens";
import { WeatherRepository } from "@/modules/weather/adapters/WeatherRepository";

@Module({
  providers: [
    {
      provide: WEATHER_PORT,
      inject: [API_ENV, CACHE_STORE],
      useFactory: (env: ApiEnv, cache: CacheStore) => new WeatherRepository(new OpenMeteoClient(openMeteoUrls(env)), cache),
    },
  ],
  exports: [WEATHER_PORT],
})
export class WeatherModule {}

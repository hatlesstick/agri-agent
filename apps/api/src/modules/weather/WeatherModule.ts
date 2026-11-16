import { Module } from "@nestjs/common";
import { CACHE_STORE, type CacheStore } from "@/common/cache";
import { OpenMeteoClient } from "@/modules/weather/adapters/OpenMeteoClient";
import { WEATHER_PORT } from "@/modules/weather/weather.tokens";
import { WeatherRepository } from "@/modules/weather/adapters/WeatherRepository";

@Module({
  providers: [{ provide: WEATHER_PORT, inject: [CACHE_STORE], useFactory: (cache: CacheStore) => new WeatherRepository(new OpenMeteoClient(), cache) }],
  exports: [WEATHER_PORT],
})
export class WeatherModule {}

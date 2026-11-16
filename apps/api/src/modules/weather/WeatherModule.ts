import { Module } from "@nestjs/common";
import { OpenMeteoClient } from "@/modules/weather/OpenMeteoClient";
import { WEATHER_PORT } from "@/modules/weather/weather.tokens";
import { WeatherRepository } from "@/modules/weather/WeatherRepository";

@Module({
  providers: [{ provide: WEATHER_PORT, useFactory: () => new WeatherRepository(new OpenMeteoClient()) }],
  exports: [WEATHER_PORT],
})
export class WeatherModule {}

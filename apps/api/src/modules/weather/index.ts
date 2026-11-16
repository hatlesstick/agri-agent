export { OpenMeteoClient, OpenMeteoError } from "@/modules/weather/adapters/OpenMeteoClient";
export { WEATHER_PORT } from "@/modules/weather/weather.tokens";
export { isWeatherError, type Forecast, type GeoLocation, type HourlyPoint, type WeatherError, type WeatherPort, type WeatherResult } from "@/modules/weather/weather.types";
export { WeatherModule } from "@/modules/weather/WeatherModule";
export { FORECAST_CACHE_MAX_ENTRIES, WeatherRepository } from "@/modules/weather/adapters/WeatherRepository";

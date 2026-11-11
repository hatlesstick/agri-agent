export type HourlyPoint = {
  time: string;
  temperature: number | null;
  windSpeed: number | null;
  precipitation: number | null;
  precipitationProbability: number | null;
  humidity: number | null;
};

export type GeoLocation = {
  name: string;
  country: string;
  region: string | null;
  latitude: number;
  longitude: number;
};

export type Forecast = {
  city: string;
  country: string;
  region: string | null;
  latitude: number;
  longitude: number;
  timezone: string;
  hourly: HourlyPoint[];
};

export type WeatherError = { error: "city_not_found" | "weather_unavailable" };

export type WeatherResult = Forecast | WeatherError;

export function isWeatherError(result: WeatherResult): result is WeatherError {
  return "error" in result;
}

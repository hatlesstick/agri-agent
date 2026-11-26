export function wetBulbTemperature(temperature: number, humidity: number): number {
  return (
    temperature * Math.atan(0.151977 * Math.sqrt(humidity + 8.313659)) +
    Math.atan(temperature + humidity) -
    Math.atan(humidity - 1.676331) +
    0.00391838 * humidity ** 1.5 * Math.atan(0.023101 * humidity) -
    4.686035
  );
}

export function deltaT(temperature: number, humidity: number): number {
  return temperature - wetBulbTemperature(temperature, humidity);
}

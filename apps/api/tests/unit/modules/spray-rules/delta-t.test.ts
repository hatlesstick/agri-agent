import { describe, expect, it } from "vitest";
import { deltaT, wetBulbTemperature } from "@/modules/spray-rules/delta-t";

describe("wetBulbTemperature (Stull 2011 approximation)", () => {
  it("is close to the psychrometric value at 20 °C and 50 % humidity", () => {
    expect(wetBulbTemperature(20, 50)).toBeCloseTo(13.7, 1);
  });

  it("equals the dry-bulb temperature at saturation", () => {
    expect(wetBulbTemperature(15, 100)).toBeCloseTo(15, 0);
  });
});

describe("deltaT", () => {
  it("is dry-bulb minus wet-bulb temperature", () => {
    expect(deltaT(20, 50)).toBeCloseTo(6.3, 1);
  });

  it("is near zero for saturated air", () => {
    expect(deltaT(15, 100)).toBeLessThan(0.5);
  });
});

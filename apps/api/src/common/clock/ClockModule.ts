import { Global, Module } from "@nestjs/common";
import { CLOCK, systemClock } from "@/common/clock/clock";

@Global()
@Module({ providers: [{ provide: CLOCK, useValue: systemClock }], exports: [CLOCK] })
export class ClockModule {}

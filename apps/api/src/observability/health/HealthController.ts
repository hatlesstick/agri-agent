import { Controller, Get, HttpStatus, Inject, Res } from "@nestjs/common";
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { DATABASE, type DatabaseHandle } from "@/database";

type Readiness = { status: "ok" | "degraded"; checks: { config: "ok"; database: "ok" | "down" } };

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(@Inject(DATABASE) private readonly database: DatabaseHandle) {}

  @Get("live")
  @ApiOkResponse({ description: "The process is up." })
  live(): { status: "ok" } {
    return { status: "ok" };
  }

  @Get("ready")
  @ApiOkResponse({ description: "Dependencies are ready to serve traffic." })
  @ApiServiceUnavailableResponse({ description: "A dependency (database) is down." })
  async ready(@Res({ passthrough: true }) res: Response): Promise<Readiness> {
    const database = (await this.database.ping()) ? "ok" : "down";
    if (database === "down") res.status(HttpStatus.SERVICE_UNAVAILABLE);
    return { status: database === "ok" ? "ok" : "degraded", checks: { config: "ok", database } };
  }
}

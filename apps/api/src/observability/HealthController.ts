import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";

@ApiTags("health")
@Controller("health")
export class HealthController {
  @Get("live")
  @ApiOkResponse({ description: "The process is up." })
  live(): { status: "ok" } {
    return { status: "ok" };
  }

  @Get("ready")
  @ApiOkResponse({ description: "Dependencies are ready to serve traffic." })
  ready(): { status: "ok"; checks: Record<string, "ok"> } {
    return { status: "ok", checks: { config: "ok" } };
  }
}

import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";

@ApiTags("health")
@Controller()
export class RootController {
  @Get()
  @ApiOkResponse({ description: "The API is up; points to the health endpoints." })
  root(): { name: string; status: "ok"; health: string } {
    return { name: "agri-agent API", status: "ok", health: "/health/ready" };
  }
}

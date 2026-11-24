import { Controller, Get, Req, Res } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { ROOT_STATUS, rootPage } from "@/observability/health/root-page";

@ApiTags("health")
@Controller()
export class RootController {
  @Get()
  @ApiOkResponse({ description: "The API is up. Browsers get an HTML status page; other clients get JSON." })
  root(@Req() req: Request, @Res({ passthrough: true }) res: Response): string | typeof ROOT_STATUS {
    if (req.accepts(["json", "html"]) !== "html") return ROOT_STATUS;
    res.type("html");
    return rootPage();
  }
}

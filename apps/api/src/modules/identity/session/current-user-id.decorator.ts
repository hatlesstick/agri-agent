import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { SessionRequest } from "@/modules/identity/identity.types";

export const CurrentUserId = createParamDecorator((_data: unknown, context: ExecutionContext): string => context.switchToHttp().getRequest<SessionRequest>().userId);

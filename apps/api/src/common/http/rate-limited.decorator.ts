import { SetMetadata } from "@nestjs/common";
import type { RateLimitedRoute } from "@/common/http/rate-limit";

export const RATE_LIMITED_ROUTE = "agri:rate-limited-route";

export const RateLimited = (route: RateLimitedRoute) => SetMetadata(RATE_LIMITED_ROUTE, route);

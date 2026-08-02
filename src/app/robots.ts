import type { MetadataRoute } from "next";

// Gap found in this session's audit: no robots.txt existed. Allow-all is
// correct today — every route is public marketing/demo content, nothing
// behind auth yet (Phase 2). Revisit once /app/* authenticated routes exist.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
  };
}

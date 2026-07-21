import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Client-cache page segments so board-to-board navigation is instant.
    // Server actions still revalidatePath, and boards keep optimistic local
    // state, so 30s of staleness is never user-visible.
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
  },
};

export default nextConfig;

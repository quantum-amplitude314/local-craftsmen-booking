// @ts-expect-error The OpenNext build generates this JavaScript entry without types.
import openNextWorker from "./.open-next/worker.js";

/**
 * The extensions src/proxy.ts skips. Cloudflare serves real files from the static assets before
 * the Worker runs, so such a path here is a missing file: answer it without starting Next.
 */
const MISSING_FILE_PATH = /\.(?:avif|ico|jpg|png|svg|txt|xml)$/;

export default {
  fetch: async (request, env, ctx) => {
    const { pathname } = new URL(request.url);
    if (MISSING_FILE_PATH.test(pathname)) return new Response(null, { status: 404 });
    const response = await openNextWorker.fetch(request, env, ctx);

    return response;
  },
} satisfies ExportedHandler<CloudflareEnv>;

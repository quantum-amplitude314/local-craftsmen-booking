import "server-only";

import { getWorkerContext } from "@/lib/env";
import packageJson from "../../package.json";

const SHORT_VERSION_ID_LENGTH = 8;

/** The `package.json` version, e.g. `v1.2.1`. */
export const appVersion = `v${packageJson.version}`;

/**
 * The app version and the Worker version id serving this request, e.g. `v1.2.1 · 9f50851d`;
 * the app version alone in `next dev`.
 */
export const getDeployedVersion = async () => {
  const context = await getWorkerContext();
  if (!context) return appVersion;
  const { id } = context.env.CF_VERSION_METADATA;
  const deployedVersion = `${appVersion} · ${id.slice(0, SHORT_VERSION_ID_LENGTH)}`;

  return deployedVersion;
};

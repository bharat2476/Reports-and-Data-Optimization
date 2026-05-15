import "dotenv/config";

import { runLifecycleCycle } from "@/lib/lifecycle/run-lifecycle-cycle";

runLifecycleCycle()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.errors.length > 0 ? 1 : 0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

"use client";

import { useRouter } from "next/navigation";
import { MOUNT_PATH, withMountPath } from "./mount-path";

export function usePublishRouter() {
  const router = useRouter();

  return {
    push(path: string) {
      if (!MOUNT_PATH) {
        router.push(path);
        return;
      }
      window.location.assign(withMountPath(path));
    },
    replace(path: string) {
      if (!MOUNT_PATH) {
        router.replace(path);
        return;
      }
      window.location.replace(withMountPath(path));
    },
  };
}

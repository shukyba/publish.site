import { Suspense } from "react";
import { CampaignClient } from "../campaign-client";

export default function CampaignPage() {
  return (
    <Suspense fallback={null}>
      <CampaignClient />
    </Suspense>
  );
}

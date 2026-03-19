"use client";

import { PageHeader, Tabs } from "@raven/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { match } from "ts-pattern";
import { RequestsView } from "./components/requests-view";
import { SessionsView } from "./components/sessions-view";

type View = "requests" | "sessions";

const RequestsPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const view = (searchParams.get("view") as View) ?? "requests";
  const setView = (v: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", v);
    router.replace(`?${params.toString()}`);
  };

  return (
    <div>
      <PageHeader
        description={match(view)
          .with("requests", () => "View and inspect individual API requests.")
          .with("sessions", () => "View sessions grouped by conversation.")
          .exhaustive()}
        title="Requests"
      />

      <Tabs
        onChange={setView}
        tabs={[
          { label: "Requests", value: "requests" },
          { label: "Sessions", value: "sessions" }
        ]}
        value={view}
      />

      {match(view)
        .with("requests", () => <RequestsView />)
        .with("sessions", () => <SessionsView />)
        .exhaustive()}
    </div>
  );
};

export default RequestsPage;

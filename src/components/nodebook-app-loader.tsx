"use client";

import dynamic from "next/dynamic";

const NodebookApp = dynamic(() => import("@/components/nodebook-app").then((module) => module.NodebookApp), {
  ssr: false,
  loading: () => <AppSkeleton />,
});

function AppSkeleton() {
  return (
    <div className="boot-screen" aria-label="Loading Nodebook">
      <span className="skeleton-mark">N</span>
      <p>Opening your local workspace…</p>
    </div>
  );
}

export function NodebookAppLoader() {
  return <NodebookApp />;
}

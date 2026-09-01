"use client";

import dynamic from "next/dynamic";

const NodebookApp = dynamic(() => import("@/components/nodebook-app").then((module) => module.NodebookApp), {
  ssr: false,
  loading: () => <AppSkeleton />,
});

function AppSkeleton() {
  return (
    <div className="app-skeleton" aria-label="Loading Nodebook">
      <div className="skeleton-rail" />
      <div className="skeleton-stage">
        <div className="skeleton-topbar" />
        <div className="skeleton-canvas">
          <span className="skeleton-mark">N</span>
          <p>Opening your local workspace…</p>
        </div>
      </div>
      <div className="skeleton-inspector" />
    </div>
  );
}

export function NodebookAppLoader() {
  return <NodebookApp />;
}

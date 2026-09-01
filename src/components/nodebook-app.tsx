"use client";

import { CanvasWorkspace } from "@/components/canvas/canvas-workspace";
import { Inspector } from "@/components/inspector";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { useWebMcp } from "@/hooks/use-webmcp";
import { useWorkspacePersistence } from "@/hooks/use-workspace-persistence";
import { useWorkspaceStore } from "@/lib/store";
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from "motion/react";
import { useState } from "react";

export function NodebookApp() {
  useWorkspacePersistence();
  useWebMcp();
  const hydrated = useWorkspaceStore((state) => state.hydrated);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  if (!hydrated) {
    return (
      <div className="boot-screen">
        <span className="skeleton-mark">N</span>
        <p>Opening your local workspace…</p>
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="nodebook-app">
        <Sidebar />
        <section className="workspace-stage">
          <Topbar
            isInspectorOpen={isInspectorOpen}
            onToggleInspector={() => setIsInspectorOpen((isOpen) => !isOpen)}
          />
          <CanvasWorkspace />
        </section>
        <motion.div
          animate={{ width: isInspectorOpen ? 298 : 0 }}
          aria-hidden={!isInspectorOpen}
          className="inspector-shell"
          id="inspector-panel"
          initial={false}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <AnimatePresence initial={false}>
            {isInspectorOpen ? (
              <motion.div
                animate={{ opacity: 1, x: 0 }}
                className="inspector-motion-panel"
                exit={{ opacity: 0, x: 24 }}
                initial={{ opacity: 0, x: 24 }}
                key="inspector"
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
              >
                <Inspector />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </div>
    </MotionConfig>
  );
}

"use client";

import { CanvasWorkspace } from "@/components/canvas/canvas-workspace";
import { Inspector } from "@/components/inspector";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { useWebMcp } from "@/hooks/use-webmcp";
import { useWorkspacePersistence } from "@/hooks/use-workspace-persistence";
import { useWorkspaceStore } from "@/lib/store";
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from "motion/react";
import { useCallback, useState } from "react";

export function NodebookApp() {
  useWorkspacePersistence();
  useWebMcp();
  const hydrated = useWorkspaceStore((state) => state.hydrated);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [evidenceFocusRequest, setEvidenceFocusRequest] = useState(0);
  const shouldReduceMotion = useReducedMotion();
  const openInspector = useCallback(() => {
    setEvidenceFocusRequest(0);
    setIsInspectorOpen(true);
  }, []);
  const openEvidence = useCallback(() => {
    setEvidenceFocusRequest((request) => request + 1);
    setIsInspectorOpen(true);
  }, []);

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
        <motion.div
          animate={{ width: isSidebarOpen ? 238 : 0 }}
          aria-hidden={!isSidebarOpen}
          className="sidebar-shell"
          id="workspace-sidebar"
          initial={false}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <AnimatePresence initial={false}>
            {isSidebarOpen ? (
              <motion.div
                animate={{ opacity: 1, x: 0 }}
                className="sidebar-motion-panel"
                exit={{ opacity: 0, x: -24 }}
                initial={{ opacity: 0, x: -24 }}
                key="sidebar"
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
              >
                <Sidebar />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
        <section className="workspace-stage">
          <Topbar
            isInspectorOpen={isInspectorOpen}
            isSidebarOpen={isSidebarOpen}
            onToggleInspector={() => {
              setEvidenceFocusRequest(0);
              setIsInspectorOpen((isOpen) => !isOpen);
            }}
            onToggleSidebar={() => setIsSidebarOpen((isOpen) => !isOpen)}
          />
          <CanvasWorkspace
            isInspectorOpen={isInspectorOpen}
            onOpenEvidence={openEvidence}
            onOpenInspector={openInspector}
          />
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
                <Inspector evidenceFocusRequest={evidenceFocusRequest} />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </div>
    </MotionConfig>
  );
}

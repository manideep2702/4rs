/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SceneManager } from './three/SceneManager';
import { SceneContext } from './three/SceneContext';
import { useAgencyOrchestrator } from './hooks/useAgencyOrchestrator';
import { useAgencyStore } from './store/agencyStore';
import Header from './components/Header';
import InspectorPanel from './components/InspectorPanel';
import { ActionLogPanel } from './components/ActionLogPanel';
import { KanbanPanel } from './components/KanbanPanel';
import { FinalOutputModal } from './components/FinalOutputModal';
import SimulationView from './components/SimulationView';
import BYOKModal from './components/BYOKModal';
import AuthModal from './components/AuthModal';
import PricingModal from './components/PricingModal';
import ProjectsModal from './components/ProjectsModal';
import { useStore } from './store/useStore';
import { useAuth } from './hooks/useAuth';
import { useAuthStore } from './store/authStore';

/** Mounts inside SceneContext so useSceneManager() is available. */
function AgencyOrchestrator() {
  useAgencyOrchestrator();
  return null;
}

const App: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<SceneManager | null>(null);
  const [sceneManager, setSceneManager] = useState<SceneManager | null>(null);
  const { isLogOpen, isKanbanOpen, setIsResizing } = useAgencyStore();
  const { llmConfig, isBYOKOpen, setBYOKOpen } = useStore();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [kanbanHeight, setKanbanHeight] = useState(220);
  const [showAuth, setShowAuth] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showProjects, setShowProjects] = useState(false);

  // Init auth listener
  useAuth();
  const { isAuthReady, user, tier } = useAuthStore();
  const isPro = tier === 'pro';

  const startResizing = useCallback(() => setIsResizing(true), [setIsResizing]);
  const stopResizing = useCallback(() => setIsResizing(false), [setIsResizing]);

  const resize = useCallback((e: MouseEvent) => {
    if (useAgencyStore.getState().isResizing) {
      const windowHeight = window.innerHeight;
      const newHeight = windowHeight - e.clientY;
      const minHeight = windowHeight * 0.2;
      const maxHeight = windowHeight * 0.5;
      if (newHeight >= minHeight && newHeight <= maxHeight) setKanbanHeight(newHeight);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  // Only open BYOK modal if user has no API key AND is not Pro (platform keys)
  useEffect(() => {
    if (isAuthReady && !isPro && !llmConfig.apiKey) {
      setBYOKOpen(true);
    }
  }, [isAuthReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle checkout redirect params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      window.history.replaceState({}, '', '/');
    }
  }, []);

  useEffect(() => {
    if (canvasRef.current && !managerRef.current) {
      const manager = new SceneManager(canvasRef.current);
      managerRef.current = manager;
      setSceneManager(manager);
    }
    return () => {
      if (managerRef.current) {
        managerRef.current.dispose();
        managerRef.current = null;
        setSceneManager(null);
      }
    };
  }, []);

  return (
    <SceneContext.Provider value={sceneManager}>
      <AgencyOrchestrator />
      <div className="w-screen h-screen bg-white dark:bg-zinc-900 overflow-hidden flex flex-col">
        {!isFullscreen && (
          <Header
            onSignIn={() => setShowAuth(true)}
            onShowProjects={() => setShowProjects(true)}
            onShowPricing={() => setShowPricing(true)}
          />
        )}

        <div className="flex-1 flex flex-row min-h-0 min-w-0 overflow-hidden">
          {isLogOpen && !isFullscreen && <ActionLogPanel />}

          <div className="relative flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden bg-zinc-50 dark:bg-zinc-800">
            <SimulationView canvasRef={canvasRef} isFullscreen={isFullscreen} setIsFullscreen={setIsFullscreen} />

            {isKanbanOpen && !isFullscreen && (
              <div
                className={`h-2 bg-transparent hover:bg-zinc-200 dark:hover:bg-zinc-700 border-t border-black/5 dark:border-zinc-700 transition-colors cursor-row-resize z-30 flex items-center justify-center group shrink-0 ${useAgencyStore.getState().isResizing ? 'bg-zinc-300' : ''}`}
                onMouseDown={startResizing}
              >
                <div className="w-12 h-1 bg-zinc-300 dark:bg-zinc-600 rounded-full group-hover:bg-zinc-400 dark:group-hover:bg-zinc-500" />
              </div>
            )}
            {isKanbanOpen && !isFullscreen && <KanbanPanel height={kanbanHeight} />}
          </div>

          {!isFullscreen && <InspectorPanel />}
        </div>

        <FinalOutputModal />

        {isBYOKOpen && !isPro && <BYOKModal onClose={() => setBYOKOpen(false)} />}
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
        {showPricing && (
          <PricingModal
            onClose={() => setShowPricing(false)}
            onSignIn={() => { setShowPricing(false); setShowAuth(true) }}
          />
        )}
        {showProjects && (
          <ProjectsModal
            onClose={() => setShowProjects(false)}
            onUpgrade={() => { setShowProjects(false); setShowPricing(true) }}
          />
        )}
      </div>
    </SceneContext.Provider>
  );
};

export default App;

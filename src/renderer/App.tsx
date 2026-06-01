/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './views/Dashboard';
import { AgentStudio } from './views/AgentStudio';
import { KnowledgeBase } from './views/KnowledgeBase';
import { Drafts } from './views/Drafts';
import { Projects } from './views/Projects';
import { AutoLearning } from './views/AutoLearning';
import { WebBuilder } from './views/WebBuilder';
import { ViewState } from './types';
import { EnterpriseProvider } from './context/EnterpriseContext';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');

  useEffect(() => {
    const handleOpenView = (event: Event) => {
      const view = (event as CustomEvent<{ view?: ViewState }>).detail?.view;
      if (view) {
        setCurrentView(view);
      }
    };
    window.addEventListener('geo-agent-open-view', handleOpenView);
    return () => window.removeEventListener('geo-agent-open-view', handleOpenView);
  }, []);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'agent':
        return <AgentStudio />;
      case 'knowledge':
        return <KnowledgeBase />;
      case 'drafts':
        return <Drafts />;
      case 'projects':
        return <Projects />;
      case 'learning':
        return <AutoLearning />;
      case 'marketplace':
        return <WebBuilder />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <EnterpriseProvider>
      <Layout currentView={currentView} onViewChange={setCurrentView}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full h-full"
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </Layout>
    </EnterpriseProvider>
  );
}


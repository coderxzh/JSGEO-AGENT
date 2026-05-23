/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './views/Dashboard';
import { AgentStudio } from './views/AgentStudio';
import { KnowledgeBase } from './views/KnowledgeBase';
import { Drafts } from './views/Drafts';
import { Projects } from './views/Projects';
import { AutoLearning } from './views/AutoLearning';
import { ViewState } from './types';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');

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
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentView={currentView} onViewChange={setCurrentView}>
      {renderView()}
    </Layout>
  );
}

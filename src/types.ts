import React from 'react';

export type ViewState = 
  | 'dashboard' 
  | 'agent' 
  | 'knowledge' 
  | 'drafts' 
  | 'projects' 
  | 'learning';

export interface LayoutProps {
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
  children: React.ReactNode;
}

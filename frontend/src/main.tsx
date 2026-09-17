import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';
import 'react-cheminfo/styles/chrome.css';
import './index.css';

import { FocusStyleManager } from '@blueprintjs/core';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App.tsx';
import { startRouting } from './state/routing.ts';

// Blueprint outlines every click target unless it is told that a focus ring is
// for the keyboard.
FocusStyleManager.onlyShowFocusOnTabs();
startRouting();

const container = document.querySelector('#root');
if (container === null) throw new Error('the page has no #root to render into');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

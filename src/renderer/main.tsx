import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import { initDevToolsConsole } from './utils/devToolsConsole.js';
import './index.css';

// Initialize window.purrsonica console API for Developer Mode
initDevToolsConsole();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

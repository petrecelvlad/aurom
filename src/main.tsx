/**
 * @propolis
 * {
 *   "role": "ENTRY_POINT",
 *   "constraints": ["React client bootstrap — mounts App into #root"],
 *   "agent_instructions": "Do not add application logic here; this file only wires up the React root."
 * }
 */

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext';
import { OpsProvider } from './contexts/OpsContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <OpsProvider>
          <App />
        </OpsProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);

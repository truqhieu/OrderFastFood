import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { GOOGLE_CLIENT_ID } from './auth/google.js';
import { AuthProvider } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { DialogProvider } from './context/DialogContext.jsx';
import { LocationProvider } from './context/LocationContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import 'leaflet/dist/leaflet.css';
import './index.css';

const app = (
  <BrowserRouter>
    <ToastProvider>
      <DialogProvider>
        <AuthProvider>
          <LocationProvider>
            <CartProvider>
              <App />
            </CartProvider>
          </LocationProvider>
        </AuthProvider>
      </DialogProvider>
    </ToastProvider>
  </BrowserRouter>
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {GOOGLE_CLIENT_ID ? <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{app}</GoogleOAuthProvider> : app}
  </React.StrictMode>
);

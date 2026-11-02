import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { DialogProvider } from './context/DialogContext.jsx';
import { LocationProvider } from './context/LocationContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import 'leaflet/dist/leaflet.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
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
  </React.StrictMode>
);

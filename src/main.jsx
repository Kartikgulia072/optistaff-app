import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// TEMPORARY: an on-screen debug console you can use directly on the phone,
// no computer/USB debugging needed. Adds a small floating button (bottom
// right) -- tap it to see console logs, network requests, etc. right on the
// device screen. Remove this import + the eruda.init() call once you're done
// debugging the notification issue.
import eruda from 'eruda';
eruda.init();

// 1. Import the Capacitor UI elements
import { defineCustomElements } from '@ionic/pwa-elements/loader';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// 2. Initialize the UI elements
defineCustomElements(window);
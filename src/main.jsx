import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// 1. Import the Capacitor UI elements
import { defineCustomElements } from '@ionic/pwa-elements/loader';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// 2. Initialize the UI elements
defineCustomElements(window);
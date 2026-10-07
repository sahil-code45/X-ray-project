import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import App from './App';
import './index.css';
import { API_BASE_URL } from './config';

// Automatically forward API calls to the live Render backend when running in production
axios.interceptors.request.use((config) => {
  if (config.url && config.url.includes('http://localhost:8000')) {
    config.url = config.url.replace('http://localhost:8000', API_BASE_URL);
  }
  return config;
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

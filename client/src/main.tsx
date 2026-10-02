import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './portal.css';
import { App } from './App';
import './theme.css';
import { BrowserRouter } from 'react-router-dom';

createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter><App /></BrowserRouter></StrictMode>);

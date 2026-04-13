import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { installNativeUrlListener, syncInitialNativeUrl } from './services/mobileRuntime';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

const bootstrap = async () => {
  await syncInitialNativeUrl();
  await installNativeUrlListener();

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

void bootstrap();

import React from 'react';
import ReactDOM from 'react-dom';
import * as Sentry from '@sentry/react';
import { Integrations } from '@sentry/tracing';
import Aviator from 'aviator';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import App from 'src/apps/mydb/App';
import appRoutes from 'src/apps/mydb/routes';
import { RootStore, StoreContext } from 'src/stores/mobx/RootStore';
import { RepoRootStore, RepoStoreContext } from 'src/stores/RepoRootStore';

Sentry.init({
  sendClientReports: false,
  dsn: process.env.SENTRY_FRONTEND_DSN,
  integrations: [new Integrations.BrowserTracing()],

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: process.env.SENTRY_FRONTEND_SAMPLE_RATE,
});

document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('app');
  if (domElement) {
    const repoRootStore = RepoRootStore.create({});
    ReactDOM.render(
      <StoreContext.Provider value={RootStore.create({})}>
        <RepoStoreContext.Provider value={repoRootStore}>
          <DndProvider backend={HTML5Backend}>
            <App />
          </DndProvider>
        </RepoStoreContext.Provider>
      </StoreContext.Provider>,
      domElement
    );
    appRoutes().then(() => { Aviator.dispatch(); });
  }
});

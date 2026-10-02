import React from 'react';
import ReactDOM from 'react-dom';
import Aviator from 'aviator';
import { DndProvider } from 'react-dnd';

// For Chemotion Repository
import initPublicRoutes from 'src/repo/libHome/homeRoutes';
import { RepoRootStore, RepoStoreContext } from 'src/repo/stores/RepoRootStore';

import { TouchBackend } from 'react-dnd-touch-backend';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { MultiBackend, TouchTransition } from 'dnd-multi-backend';
import Home from 'src/apps/home/Home';
import { ExtendedSignInForm } from 'src/components/navigation/NavNewSession';

// For Chemotion Repository
const backendOptions = {
  backends: [
    {
      backend: HTML5Backend, // Default drag and drop backend
    },
    {
      backend: TouchBackend, // Touch Drag Support
      options: { enableMouseEvents: true },
      transition: TouchTransition, // Detects if touch is used
    },
  ],
};

document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('Home');
  if (domElement) {
    const repoRootStore = RepoRootStore.create({});
    ReactDOM.render(
      <RepoStoreContext.Provider value={repoRootStore}>
        <DndProvider backend={MultiBackend} options={backendOptions}>
          <Home />
        </DndProvider>
      </RepoStoreContext.Provider>,
      domElement
    );
  } else {
    const domElementLogin = document.getElementById('Home-Login');
    if (domElementLogin) {
      ReactDOM.render(
        <RepoStoreContext.Provider value={RepoRootStore.create({})}>
          <ExtendedSignInForm
            url={domElementLogin.dataset.url ?? '/users/sign_in'}
            rememberable={domElementLogin.dataset.rememberable ?? true}
            username={domElementLogin.dataset.username}
            fromInvalid={domElementLogin.dataset.invalid ?? false}
          />
        </RepoStoreContext.Provider>,
        domElementLogin
      );
    }
  }

  // For Chemotion Repository
  initPublicRoutes();
  Aviator.dispatch();
});
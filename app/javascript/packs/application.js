// see https://github.com/rackt/react-router/issues/1067

// Suppress the benign "ResizeObserver loop completed with undelivered
// notifications" warning that react-select, react-datepicker, and AntD
// components can trigger on first render. It doesn't break anything but the
// dev-server overlay treats every uncaught error as fatal.
(function installResizeObserverSuppression() {
  if (typeof window === 'undefined') return;

  var RESIZE_OBSERVER_MESSAGES = [
    'ResizeObserver loop completed with undelivered notifications.',
    'ResizeObserver loop limit exceeded',
  ];
  var isBenign = function (msg) {
    if (!msg) return false;
    for (var i = 0; i < RESIZE_OBSERVER_MESSAGES.length; i++) {
      if (msg.indexOf(RESIZE_OBSERVER_MESSAGES[i]) !== -1) return true;
    }
    return false;
  };

  // 1. Monkey-patch ResizeObserver so its callback is deferred to the next
  //    animation frame. This avoids the "loop completed" condition entirely:
  //    the observer does not re-dispatch within the same layout pass.
  if (typeof window.ResizeObserver === 'function') {
    var NativeResizeObserver = window.ResizeObserver;
    var PatchedResizeObserver = function (callback) {
      var deferredCallback = function (entries, observer) {
        if (typeof window.requestAnimationFrame !== 'function') {
          try { callback(entries, observer); } catch (e) { /* swallow */ }
          return;
        }
        window.requestAnimationFrame(function () {
          try {
            callback(entries, observer);
          } catch (e) {
            if (!isBenign(e && e.message)) throw e;
          }
        });
      };
      return new NativeResizeObserver(deferredCallback);
    };
    PatchedResizeObserver.prototype = NativeResizeObserver.prototype;
    window.ResizeObserver = PatchedResizeObserver;
  }

  // 2. Capture-phase window error listener — filters out anything that still
  //    slips through before the dev-server overlay's bubble-phase listener.
  window.addEventListener('error', function (event) {
    if (event && isBenign(event.message)) {
      event.stopImmediatePropagation();
      event.stopPropagation();
      event.preventDefault();
      return false;
    }
    return undefined;
  }, true);

  // 3. Chain-wrap window.onerror in case the overlay reads it directly.
  var prevOnError = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    if (isBenign(message)) return true; // signal handled
    if (typeof prevOnError === 'function') {
      return prevOnError.apply(this, arguments);
    }
    return false;
  };

  // 4. Also guard unhandled promise rejections with the same message.
  window.addEventListener('unhandledrejection', function (event) {
    var reason = event && event.reason;
    var msg = reason && (reason.message || (typeof reason === 'string' ? reason : ''));
    if (isBenign(msg)) {
      event.stopImmediatePropagation();
      event.stopPropagation();
      event.preventDefault();
    }
  }, true);
})();

var React = require('react');
var Home = require('src/apps/home');
var CnC = require('src/apps/commandAndControl');
var AdminHome = require('src/apps/admin');
var ChemSpectra = require('src/apps/chemspectra/ChemSpectra');
var ChemSpectraEditor = require('src/apps/chemspectra/ChemSpectraEditor');
var MoleculeModerator = require('src/apps/moleculeModerator');
var OmniauthCredential = require('src/apps/omniauthCredential');
var UserCounter = require('src/apps/userCounter');
var ScifinderCredential = require('src/apps/scifinderCredential');
var StructureEditorUserSetting = require('src/components/structureEditor/UserSetting');
var LoginOptions = require('src/repo/chemrepo/user/RepoLoginOptions');
var ConverterAdmin = require('src/apps/converter/ConverterAdmin');
var GenericElementsAdmin = require('src/apps/generic/GenericElementsAdmin');
var GenericSegmentsAdmin = require('src/apps/generic/GenericSegmentsAdmin');
var GenericDatasetsAdmin = require('src/apps/generic/GenericDatasetsAdmin');
var InventoryLabelSettings = require('src/apps/settings/InventoryLabelSettings');
var mydb = require('src/apps/mydb');
var AgGridReact = require('src/agGridSetup');


// Fro REPO
var RepoNewsEditor = require('src/repo/repoHome/RepoNewsEditor');
var RepoNewsReader = require('src/repo/repoHome/RepoNewsReader');
var RepoHowToEditor = require('src/repo/repoHome/RepoHowToEditor');
var RepoHowToReader = require('src/repo/repoHome/RepoHowToReader');

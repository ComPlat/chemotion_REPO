import alt from 'src/stores/alt/alt';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';

class SpectraActions {
  ToggleModal() {
    return null;
  }

  LoadSpectra(spcInfos, element = null) {
    const idxs = spcInfos && spcInfos.map(si => si.idx);
    if (idxs.length === 0) {
      return null;
    }

    return (dispatch) => {
      AttachmentFetcher.fetchFiles(idxs)
        .then((fetchedFiles) => {
          dispatch({ fetchedFiles, spcInfos, element });
        }).catch((errorMessage) => {
          console.log(errorMessage); // eslint-disable-line
        });
    };
  }

  Regenerate(jcampIds, cb) {
    return (dispatch) => {
      AttachmentFetcher.regenerateSpectrum(jcampIds)
        .then(() => {
          dispatch();
          cb();
        }).catch((errorMessage) => {
          console.log(errorMessage); // eslint-disable-line
        });
    };
  }

  SaveToFile(spcInfo, peaksStr, shift, scan, thres, integration, multiplicity, predict, cb, keepPred = false, waveLengthStr, cyclicvolta, curveIdx = 0, simulatenmr = false, previousSpcInfos, isSaveCombined = false, axesUnitsStr, detector, dscMetaData) {
    return (dispatch) => {
      AttachmentFetcher.saveSpectrum(spcInfo.idx, peaksStr, shift, scan, thres, integration, multiplicity, predict, keepPred, waveLengthStr, cyclicvolta, curveIdx, simulatenmr, previousSpcInfos, isSaveCombined, axesUnitsStr, detector, dscMetaData)
        .then((fetchedFiles) => {
          dispatch({ fetchedFiles, spcInfo });
          cb();
        }).catch((errorMessage) => {
          console.log(errorMessage); // eslint-disable-line
        });
    };
  }

  WriteStart(payload) {
    return payload;
  }

  WriteStop() {
    return null;
  }

  InferRunning() {
    return null;
  }

  InferSpectrum(spcInfo, peaksStr, shift, scan, thres, integration, multiplicity, predict,
    targetPeaks, layout,
    cb, keepPred = false,
  ) {
    return (dispatch) => {
      AttachmentFetcher.inferSpectrum(
        spcInfo.idx, peaksStr, shift, scan, thres, integration, multiplicity,
        predict, targetPeaks, layout, keepPred
      ).then((fetchedFiles) => {
        dispatch({ fetchedFiles, spcInfo });
        cb();
      }).catch((errorMessage) => {
        console.log(errorMessage); // eslint-disable-line
      });
    };
  }

  SelectIdx(spcIdx, arrSpcIdx = []) {
    return { spcIdx, arrSpcIdx };
  }

  AddOthers(payload) {
    const jcamps = payload.jcamps || [];
    const jcamp = jcamps[0];

    return (dispatch) => {
      AttachmentFetcher.fetchJcamp({ file: jcamp })
        .then((rsp) => {
          dispatch(rsp);
        }).catch((errorMessage) => {
          console.log(errorMessage); // eslint-disable-line
        });
    };
  }

  RegenerateEdited(jcampIds, molfile, cb) {
    return (dispatch) => {
      AttachmentFetcher.regenerateEditedSpectrum(jcampIds, molfile)
        .then(() => {
          dispatch();
          cb();
        }).catch((errorMessage) => {
          console.log(errorMessage); // eslint-disable-line
        });
    };
  }

  ToggleModalNMRDisplayer() {
    return null;
  }

  LoadSpectraForNMRDisplayer(spcInfos, element = null) {
    const idxs = spcInfos && spcInfos.map(si => si.idx);
    if (idxs.length === 0) {
      return null;
    }

    return (dispatch) => {
      AttachmentFetcher.fetchFiles(idxs)
        .then((fetchedFiles) => {
          dispatch({ fetchedFiles, spcInfos, element });
        }).catch((errorMessage) => {
          console.log(errorMessage); // eslint-disable-line
        });
    };
  }
}

export default alt.createActions(SpectraActions);

import {
  BuildSpcInfos,
  BuildSpcInfosForNMRDisplayer,
} from 'src/utilities/SpectraHelper';

const spcChemSpectra = (element, analysis) => {
  if (element == null || analysis == null) return [];
  const spcInfos = BuildSpcInfos(element, analysis);
  if (spcInfos.length < 1) return [];
  return spcInfos;
};

const spcNmrium = (element, analysis) => {
  if (element == null || analysis == null) return [];
  const container = analysis;
  const spcInfosForNMRDisplayer = BuildSpcInfosForNMRDisplayer(
    element,
    container
  );
  if (spcInfosForNMRDisplayer.length < 1) return [];
  const arrNMRiumSpecs = spcInfosForNMRDisplayer.filter(spc =>
    spc.label.includes('.nmrium')
  );
  if (!arrNMRiumSpecs || arrNMRiumSpecs.length === 0) {
    return [];
  }
  return arrNMRiumSpecs;
};

const spc = (element, analysis) => {
  const sInfos = spcChemSpectra(element, analysis);
  const nInfos = spcNmrium(element, analysis);
  return {
    nmrium: { hasData: nInfos.length > 0, data: nInfos },
    spectra: { hasData: sInfos.length > 0, data: sInfos },
  };
};

export default spc;

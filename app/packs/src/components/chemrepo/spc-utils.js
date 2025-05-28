import {
  BuildSpcInfos,
  BuildSpcInfosForNMRDisplayer,
  isNMRKind,
} from 'src/utilities/SpectraHelper';
import PublicStore from 'src/stores/alt/repo/stores/PublicStore';
import UserStore from 'src/stores/alt/stores/UserStore';

const spcChemSpectra = (element, analysis) => {
  if (element == null || analysis == null) return [];
  const spcInfos = BuildSpcInfos(element, analysis);
  if (spcInfos.length < 1) return [];
  return spcInfos;
};

const spcNmrium = (element, analysis) => {
  if (element == null || analysis == null) return [];
  const container = analysis;
  const { chmos } = PublicStore.getState();
  const { chmos: userChmos } = UserStore.getState();
  const hasNMRium = isNMRKind(container, chmos || userChmos);
  if (!hasNMRium) return [];
  const spcInfosForNMRDisplayer = BuildSpcInfosForNMRDisplayer(
    element,
    container
  );
  if (spcInfosForNMRDisplayer.length < 1) return [];
  return spcInfosForNMRDisplayer;
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

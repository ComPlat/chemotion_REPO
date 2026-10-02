import { hNmrCheckMsg, cNmrCheckMsg } from 'src/utilities/ElementUtils';
import { contentToText } from 'src/utilities/quillFormat';
import { chmoConversions } from 'src/components/OlsComponent';

const isFileTypePass = (analysisType, attachments) => {
  const baseType = ['jpg', 'jpeg', 'png', 'tiff', 'svg'];
  const nmrType = ['jcamp', 'dx', 'jdx'];
  let files = [];
  switch (analysisType) {
    case '1H NMR':
    case chmoConversions.nmr_1h?.termId:
    case '13C NMR':
    case chmoConversions.nmr_13c?.termId:
    case '15N NMR':
    case 'NMR':
    case 'IR':
    case chmoConversions.ir.termId:
      files = attachments.filter(f => baseType.includes(f.filename.split('.').pop().toLowerCase()) && !f.is_deleted);
      if (files.length < 1) return false;
      files = attachments.filter(f => nmrType.includes(f.filename.split('.').pop().toLowerCase()) && !f.is_deleted);
      if (files.length < 1) return false;
      break;
    case 'EA':
    case chmoConversions.ea.termId:
    case 'X-Ray':
    case 'Crystall-Structure':
    case chmoConversions.crystal_structure.termId:
      files = attachments.filter(f => baseType.includes(f.filename.split('.').pop().toLowerCase()) && !f.is_deleted);
      if (files.length < 1) return false;
      break;
    default:
      break;
  }
  return true;
};

// at least one dataset has to be attached
// in dataset: instrument has to be given
const isDatasetPass = (analysis) => {
  const dataset = analysis.children;
  const attachments = dataset.filter(d => d.attachments.length > 0 && !d.is_deleted);
  if (attachments.length < 1) return false;
  const instruments = dataset.filter(d => d.extended_metadata && (d.extended_metadata.instrument || '').trim() !== '' && !d.is_deleted);
  if (instruments.length < 1) return false;
  const analysisType = (analysis.extended_metadata.kind || '').split('|').shift().trim();
  const files = attachments.filter(d => isFileTypePass(analysisType, d.attachments));
  if (files.length < 1) return false;
  return true;
};

const isNmrPass = (analysis, sample) => {
  const nmrStr = analysis.extended_metadata && contentToText(analysis.extended_metadata.content);
  const nmrType = analysis.extended_metadata && (analysis.extended_metadata.kind || '').split('|').shift().trim();
  if (nmrType !== '1H NMR' && nmrType !== '13C NMR' && nmrType !== chmoConversions.nmr_1h?.termId && nmrType !== chmoConversions.nmr_13c?.termId) {
     return true;
  }
  if (nmrType === '1H NMR' || nmrType === chmoConversions.nmr_1h?.termId) {
    return hNmrCheckMsg(sample.molecule.sum_formular, nmrStr) === '';
  } else if (nmrType === '13C NMR' || nmrType === chmoConversions.nmr_13c?.termId) {
    return cNmrCheckMsg(sample.molecule.sum_formular, nmrStr) === '';
  }
  return true;
};

export { isFileTypePass, isDatasetPass, isNmrPass };

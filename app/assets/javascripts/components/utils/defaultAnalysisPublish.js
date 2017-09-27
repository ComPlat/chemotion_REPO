import { isNmrPass, isDatasetPass } from '../../libHome/RepoCommon';

const applyPublish = (el) => {
  const ext = [];
  el.analysisArray().forEach((ana) => {
    const a = ana;
    if (ana.extended_metadata &&
      (((ana.extended_metadata.kind || '') !== '') && // fail if analysis-type is empty
        ((ana.extended_metadata.status || '') === 'Confirmed') && // && // fail if status is not set to Confirmed
        (isNmrPass(ana, el)) && // fail if NMR check fail
        (isDatasetPass(ana))
      )) {
      if (typeof ana.extended_metadata.publish === 'undefined') {
        a.extended_metadata.publish = true;
      }
    }
    ext.push(a);
  });
  return ext;
};

const defaultAnalysisPublish = (el) => {
  const element = el;
  switch (el.type) {
    case 'sample': {
      const ext = applyPublish(element);
      if (ext.length > 0) {
        const analyses = element.container.children.find(c => (c && c.container_type === 'analyses'));
        analyses.children = ext;
      }
      break;
    }
    case 'reaction': {
      // reset analysis.publish of products
      if (typeof el.products !== 'undefined' && el.products.length > 0) {
        element.products.forEach((p) => {
          const prodAna = applyPublish(p);
          if (prodAna.length > 0) {
            const analyses = p.container.children.find(c => (c && c.container_type === 'analyses'));
            analyses.children = prodAna;
          }
        });
      }
      break;
    }
    default:
      break;
  }
  return element;
};

export default defaultAnalysisPublish;

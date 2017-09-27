import * as types from 'src/apps/chemscanner/actions/ActionTypes';

export const removeMolecule = (id, fileUid, schemeIdx) => ({
  type: types.HIDE_MOLECULE, id, fileUid, schemeIdx
});

export const removeReaction = (id, fileUid, schemeIdx) => ({
  type: types.HIDE_REACTION, id, fileUid, schemeIdx
});

export const editReactionComment = (id, fileUid, schemeIdx, comment) => ({
  type: types.EDIT_REACTION_COMMENT, id, fileUid, schemeIdx, comment
});

export const editMoleculeComment = (id, fileUid, schemeIdx, comment) => ({
  type: types.EDIT_MOLECULE_COMMENT, id, fileUid, schemeIdx, comment
});

export const selectMolecule = (id, fileUid, schemeIdx) => ({
  type: types.SELECT_MOLECULE, id, fileUid, schemeIdx
});

export const selectReaction = (id, fileUid, schemeIdx) => ({
  type: types.SELECT_REACTION, id, fileUid, schemeIdx
});

//export const setResin = (id, fileUid, cdUid, atomId) => ({
//  type: types.SET_RESIN, id, fileUid, cdUid, atomId
//});

export const toggleResinInReaction = (fileUid, cdUid, rId, molId, atomId) => ({
  type: types.TOGGLE_RESIN_IN_REACTION, fileUid, cdUid, rId, molId, atomId
});

export const toggleMoleculeResin = (fileUid, cdUid, molId, atomId) => ({
  type: types.TOGGLE_MOLECULE_RESIN, fileUid, cdUid, molId, atomId
});

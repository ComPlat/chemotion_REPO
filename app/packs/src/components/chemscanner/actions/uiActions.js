/* eslint-disable no-prototype-builtins */

import * as types from 'src/apps/chemscanner/actions/ActionTypes';
import { CALL_API } from 'src/apps/chemscanner/middleware/api';

export const changeView = view => dispatch => (
  dispatch({ type: types.CHANGE_VIEW, view })
);

export const getCurrentVersion = () => dispatch => (
  dispatch({
    type: types.GET_CURRENT_VERSION,
    [CALL_API]: {
      endpoint: '/api/v1/public_chemscanner/ui/version',
      options: {
        credentials: 'same-origin',
        method: 'post',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
      },
    }
  })
);

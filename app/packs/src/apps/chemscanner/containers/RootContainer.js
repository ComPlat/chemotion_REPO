import React from 'react';
import { connect } from 'react-redux';

import Root from 'src/apps/chemscanner/components/Root';
import setCddInstance from 'src/apps/chemscanner/actions/chemdrawInstanceActions';

const RootContainer = props => <Root {...props} />;

const mapStateToProps = state => ({
  ui: state.get('ui'),
});

const mapDispatchToProps = dispatch => ({
  attachEditor: (id) => {
    const config = {
      id,
      viewonly: true,
      licenseUrl: '/cdjs/sample/ChemDraw-JS-License.xml',
      config: {
        properties: {
          StyleSheet: 'ACS Document 1996',
          chemservice: 'https://chemdrawdirect.perkinelmer.cloud/rest/'
        }
      },
      callback: cdd => dispatch(setCddInstance(cdd)),
      errorCallback: e => console.log(e),
    };

    // eslint-disable-next-line no-undef
    perkinelmer.ChemdrawWebManager.attach(config);
  },
  getCurrentVersion: () => dispatch(getCurrentVersion()),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(RootContainer);

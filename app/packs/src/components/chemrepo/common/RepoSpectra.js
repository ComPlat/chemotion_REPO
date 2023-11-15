import React from 'react';
import PropTypes from 'prop-types';
import { Tooltip, Button, OverlayTrigger } from 'react-bootstrap';
import { BuildSpcInfos } from 'src/utilities/SpectraHelper';
import SpectraActions from 'src/stores/alt/actions/SpectraActions';
import ViewSpectra from 'src/apps/mydb/elements/details/ViewSpectra';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';

const RepoSpectraBtn = (props) => {
  const { element, analysis } = props;
  if (element == null || analysis == null) return null;
  const spcInfos = BuildSpcInfos(element, analysis);
  if (spcInfos.length < 1) return null;
  const toggleSpectraModal = (e) => {
    e.stopPropagation();
    if (!props.isLogin) {
      NotificationActions.add({
        title: 'View Spectra', message: 'Please log in first.', level: 'warning', position: 'tc'
      });
    } else {
      SpectraActions.ToggleModal();
      SpectraActions.LoadSpectra.defer(spcInfos);
    }
  };
  return (
    <span>
      <OverlayTrigger placement="top" delayShow={500} overlay={<Tooltip id="spectra">click to view spectra</Tooltip>}>
        <Button
          bsSize="xsmall"
          className="button-right"
          onToggle={(open, event) => { if (event) { event.stopPropagation(); } }}
          onClick={toggleSpectraModal}
          disabled={!(spcInfos.length > 0)}
        >
          <i className="fa fa-area-chart" aria-hidden="true" />
        </Button>
      </OverlayTrigger>
      <ViewSpectra sample={element} handleSampleChanged={() => { }} handleSubmit={() => { }} />
    </span>
  );
};

RepoSpectraBtn.propTypes = { element: PropTypes.object, analysis: PropTypes.object, isLogin: PropTypes.bool };
RepoSpectraBtn.defaultProps = { isLogin: false };

export default RepoSpectraBtn;

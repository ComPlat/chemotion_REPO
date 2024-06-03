/* eslint-disable react/forbid-prop-types */
/* eslint-disable react/require-default-props */
import React from 'react';
import PropTypes from 'prop-types';
import { Tooltip, Button, OverlayTrigger } from 'react-bootstrap';
import PublicActions from 'src/stores/alt/repo/actions/PublicActions';
import SpectraActions from 'src/stores/alt/actions/SpectraActions';
import ViewSpectra from 'src/apps/mydb/elements/details/ViewSpectra';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';

function RepoSpectraBtn(props) {
  const { element, spc, isLogin, isPublic } = props;
  const toggleSpectraModal = e => {
    e.stopPropagation();
    if (!isLogin) {
      NotificationActions.add({
        title: 'View Spectra',
        message: 'Please log in first.',
        level: 'warning',
        position: 'tc',
      });
    } else {
      SpectraActions.ToggleModal();
      if (isPublic) {
        PublicActions.loadSpectra.defer(spc);
      } else {
        SpectraActions.LoadSpectra.defer(spc);
      }
    }
  };
  return (
    <span>
      <OverlayTrigger
        placement="top"
        delayShow={500}
        overlay={<Tooltip id="spectra">click to view spectra</Tooltip>}
      >
        <Button
          bsSize="xsmall"
          className="button-right"
          onToggle={(open, event) => {
            if (event) {
              event.stopPropagation();
            }
          }}
          onClick={toggleSpectraModal}
          disabled={!(spc.length > 0)}
        >
          <i className="fa fa-area-chart" aria-hidden="true" />
        </Button>
      </OverlayTrigger>
      <ViewSpectra
        sample={element}
        handleSampleChanged={() => {}}
        handleSubmit={() => {}}
        isPublic={isPublic}
      />
    </span>
  );
}

RepoSpectraBtn.propTypes = {
  element: PropTypes.object,
  spc: PropTypes.array,
  isLogin: PropTypes.bool,
  isPublic: PropTypes.bool,
};
RepoSpectraBtn.defaultProps = { isLogin: false, isPublic: false };

export default RepoSpectraBtn;

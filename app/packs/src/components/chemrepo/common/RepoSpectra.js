/* eslint-disable react/require-default-props */
/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { Tooltip, Button, OverlayTrigger } from 'react-bootstrap';
import { BuildSpcInfos } from 'src/utilities/SpectraHelper';
import PublicActions from 'src/stores/alt/repo/actions/PublicActions';
import SpectraActions from 'src/stores/alt/actions/SpectraActions';
import ViewSpectra from 'src/apps/mydb/elements/details/ViewSpectra';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';

function RepoSpectraBtn(props) {
  const { element, analysis, isLogin, isPublic } = props;
  if (element == null || analysis == null) return null;
  const spcInfos = BuildSpcInfos(element, analysis);
  if (spcInfos.length < 1) return null;
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
        PublicActions.loadSpectra.defer(spcInfos);
      } else {
        SpectraActions.LoadSpectra.defer(spcInfos);
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
          disabled={!(spcInfos.length > 0)}
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
  analysis: PropTypes.object,
  isLogin: PropTypes.bool,
  isPublic: PropTypes.bool,
};
RepoSpectraBtn.defaultProps = { isLogin: false, isPublic: false };

export default RepoSpectraBtn;

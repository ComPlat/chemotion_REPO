/* eslint-disable react/require-default-props */
/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { Tooltip, Button, OverlayTrigger } from 'react-bootstrap';
import PublicActions from 'src/stores/alt/repo/actions/PublicActions';
import SpectraActions from 'src/stores/alt/actions/SpectraActions';

function RepoNmriumBtn(props) {
  const { spc, isPublic } = props;
  const toggleNMRDisplayerModal = e => {
    e.stopPropagation();
    SpectraActions.ToggleModalNMRDisplayer();
    if (isPublic) {
      PublicActions.loadSpectraForNMRDisplayer.defer(spc, element);
    } else {
      SpectraActions.LoadSpectraForNMRDisplayer.defer(spc, element);
    }
  };

  return (
    <span>
      <OverlayTrigger
        placement="top"
        delayShow={500}
        overlay={
          <Tooltip id="__repo_tooltip_nmrium">
            Click to view data in NMRium
          </Tooltip>
        }
      >
        <Button
          bsSize="xsmall"
          className="button-right"
          onToggle={(open, event) => {
            if (event) {
              event.stopPropagation();
            }
          }}
          onClick={toggleNMRDisplayerModal}
        >
          <img
            alt="NMRium"
            src="/images/repo/nmrium-favicon.svg"
            style={{ maxHeight: '1.4vh' }}
          />
        </Button>
      </OverlayTrigger>
    </span>
  );
}

RepoNmriumBtn.propTypes = {
  spc: PropTypes.array,
  isPublic: PropTypes.bool,
};
RepoNmriumBtn.defaultProps = { isPublic: false };

export default RepoNmriumBtn;

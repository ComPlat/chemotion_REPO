import React from 'react';
import { Alert, Button, Tab } from 'react-bootstrap';
import uuid from 'uuid';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import UIActions from 'src/stores/alt/actions/UIActions';
import RepositoryActions from 'src/repo/actions/RepositoryActions';
import FundingReferences from 'src/repo/chemrepo/funding/FundingReferences';
import { permitOn } from 'src/components/common/uis';
import { validateMolecule } from 'src/repo/chemrepo/PublishCommon';

/**
 * Helper class for Chemotion Repository related functions in SampleDetails
 */
class SampleDetailsRepoHelper {
  /**
   * Get validation block for submission alerts
   * @param {Object} sample - The sample object
   * @param {Function} handleAssociateClick - Callback to handle associate click
   * @param {Function} handleResetValidation - Callback to reset validation
   * @returns {JSX.Element|null} - Alert component or null
   */
  static getValidationBlock(sample, handleAssociateClick, handleResetValidation) {
    const validateObjs = sample.validates && sample.validates.filter(v => v.value === false);
    if (!validateObjs || validateObjs.length === 0) {
      return null;
    }

    const validateAssociate = sample.validates && sample.validates.filter(v => v.value === false && v.message.includes('associated'));
    if (validateAssociate && validateAssociate.length > 0) {
      return (
        <Alert variant="danger" style={{ marginBottom: 'unset', padding: '5px', marginTop: '10px' }}>
          <strong>Submission Alert</strong>
          <p>
            This sample is associated with a Reaction and can not be published alone.
          </p>
          <Button size="sm" onClick={handleAssociateClick}>
            Go to Reaction&nbsp;<i className="icon-reaction" />
          </Button>
          <span>&nbsp;&nbsp;or&nbsp;&nbsp;</span>
          <Button size="sm" variant="danger" onClick={handleResetValidation}>
            Close Alert
          </Button>
        </Alert>
      );
    }

    return (
      <Alert variant="danger" style={{ marginBottom: 'unset', padding: '5px', marginTop: '10px' }}>
        <strong>Submission Alert</strong>&nbsp;&nbsp;
        <Button size="sm" variant="danger" onClick={handleResetValidation}>
          Close Alert
        </Button>
        <br />
        {
          validateObjs.map(m => (
            <div key={uuid.v1()}>{m.message}</div>
          ))
        }
      </Alert>
    );
  }

  /**
   * Render Fundings tab
   * @param {Object} sample - The sample object
   * @param {number} ind - Tab index
   * @returns {JSX.Element|null} - Tab component or null
   */
  static fundingsTab(sample, ind) {
    if (!sample) {
      return null;
    }
    return (
      <Tab
        eventKey={ind}
        title="Fundings & Awards"
        key={`fundings_${sample.id}_${ind}`}
      >
        <FundingReferences
          elementId={sample.id}
          elementType="Sample"
          isNew={sample.isNew}
          readOnly={sample.isNew || !permitOn(sample)}
        />
      </Tab>
    );
  }

  /**
   * Show publish sample modal
   * @param {Object} context - The component context (this)
   * @param {boolean} show - Whether to show modal
   */
  static showPublishSampleModal(context, show) {
    context.setState({ showPublishSampleModal: show });
    context.forceUpdate();
  }

  /**
   * Handle comment screen
   * @param {Object} context - The component context (this)
   */
  static handleCommentScreen(context) {
    context.setState({ commentScreen: !context.state.commentScreen });
    UIActions.toggleSidebar();
  }

  /**
   * Force publish refresh and close
   * @param {Object} context - The component context (this)
   * @param {Object} sample - The sample object
   * @param {boolean} show - Whether to show modal
   */
  static forcePublishRefreshClose(context, sample, show) {
    context.setState({ sample, showPublishSampleModal: show });
    context.forceUpdate();
  }

  /**
   * Reset validation
   * @param {Object} context - The component context (this)
   */
  static handleResetValidation(context) {
    const { sample } = context.state;
    sample.validates = [];
    context.setState({ sample });
  }

  /**
   * Handle associate click
   * @param {Object} context - The component context (this)
   */
  static handleAssociateClick(context) {
    const { sample } = context.state;
    ElementActions.tryFetchReactionById(sample.tag.taggable_data.reaction_id);
    sample.validates = [];
    context.setState({ sample });
  }

  /**
   * Handle repo xvial
   * @param {Object} context - The component context (this)
   * @param {number} elementId - Element ID
   * @param {*} xvial - Xvial data
   */
  static handleRepoXvial(context, elementId, xvial) {
    context.setState({ xvial });
    ElementActions.refreshElements('sample');
  }

  /**
   * Unseal sample
   * @param {Object} context - The component context (this)
   */
  static unseal(context) {
    const { sample } = context.state;
    sample.sealed = false;
    context.setState({ sample });
  }

  /**
   * Handle validation before publishing
   * @param {Object} context - The component context (this)
   * @param {Object} element - The element to validate
   */
  static handleValidation(context, element) {
    let validates = [];
    const sample = element;
    if (sample.tag && sample.tag.taggable_data && sample.tag.taggable_data.reaction_id) {
      validates.push({
        name: `sample [${sample.name}]`,
        value: false,
        message: `${sample.name} is associated with a Reaction.`
      });
    } else {
      const analyses = sample.analysisArray();
      if (analyses.length < 1) {
        validates.push({
          name: `sample [${sample.name}]`,
          value: false,
          message: 'Analyses data is missing.'
        });
      } else {
        const validatePt = validateMolecule(sample);
        if (validatePt.length > 0) {
          validates = validates.concat(validatePt);
        }
      }
    }
    console.log('**** validates', validates);
    if (validates.length > 0) {
      sample.validates = validates;
      console.log('**** sample', sample);
      context.setState({ sample });
    } else {
      LoadingActions.start();
      RepositoryActions.reviewPublish(element);
    }
  }
}

export default SampleDetailsRepoHelper;

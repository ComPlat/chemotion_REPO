import React from 'react';
import { Alert, Button, Tab } from 'react-bootstrap';
import uuid from 'uuid';
import UIActions from 'src/stores/alt/actions/UIActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import RepositoryActions from 'src/repo/actions/RepositoryActions';
import FundingReferences from 'src/repo/chemrepo/funding/FundingReferences';
import { permitOn } from 'src/components/common/uis';
import { validateMolecule } from 'src/repo/chemrepo/PublishCommon';

/**
 * Helper class for Chemotion Repository related functions in ReactionDetails
 */
class ReactionDetailsRepoHelper {
  /**
   * Get validation block for submission alerts
   * @param {Object} reaction - The reaction object
   * @param {Function} handleResetValidation - Callback to reset validation
   * @returns {JSX.Element|null} - Alert component or null
   */
  static getValidationBlock(reaction, handleResetValidation) {
    const validateObjs = reaction.validates && reaction.validates.filter(v => v.value === false);
    if (!validateObjs || validateObjs.length === 0) {
      return null;
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
   * @param {Object} reaction - The reaction object
   * @param {number} ind - Tab index
   * @returns {JSX.Element|null} - Tab component or null
   */
  static fundingsTab(reaction, ind) {
    if (!reaction) {
      return null;
    }
    return (
      <Tab
        eventKey={ind}
        title="Fundings & Awards"
        key={`fundings_${reaction.id}_${ind}`}
      >
        <FundingReferences
          elementId={reaction.id}
          elementType="Reaction"
          isNew={reaction.isNew}
          readOnly={reaction.isNew || !permitOn(reaction)}
        />
      </Tab>
    );
  }

  /**
   * Show publish reaction modal
   * @param {Object} context - The component context (this)
   * @param {boolean} show - Whether to show modal
   */
  static showPublishReactionModal(context, show) {
    context.setState({ showPublishReactionModal: show });
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
   * @param {Object} reaction - The reaction object
   * @param {boolean} show - Whether to show modal
   */
  static forcePublishRefreshClose(context, reaction, show) {
    context.setState({ reaction, showPublishReactionModal: show });
    context.forceUpdate();
  }

  /**
   * Reset validation
   * @param {Object} context - The component context (this)
   */
  static handleResetValidation(context) {
    const { reaction } = context.state;
    reaction.validates = [];
    context.setState({ reaction });
  }

  /**
   * Handle modal analyses check
   * @param {Object} context - The component context (this)
   * @param {Object} reaction - The reaction object
   */
  static handleModalAnalysesCheck(context, reaction) {
    context.setState({ reaction });
  }

  /**
   * Unseal reaction
   * @param {Object} context - The component context (this)
   */
  static unseal(context) {
    const { reaction } = context.state;
    reaction.sealed = false;
    context.setState({ reaction });
  }

  /**
   * Handle publish reaction modal
   * @param {Object} context - The component context (this)
   * @param {boolean} show - Whether to show modal
   */
  static handlePublishReactionModal(context, show) {
    context.setState({ showPublishReactionModal: show });
  }

  /**
   * Handle validation before publishing
   * @param {Object} context - The component context (this)
   * @param {Object} element - The element to validate
   */
  static handleValidation(context, element) {
    const validates = [];
    const reaction = element;
    const schemeOnly = (reaction && reaction.publication && reaction.publication.taggable_data &&
    reaction.publication.taggable_data.scheme_only === true) || false;

    if ((reaction.rxno || '') === '' && schemeOnly === false) {
      validates.push({ name: 'reaction_type', value: false, message: 'Reaction Type is missing.' });
    }

    if (schemeOnly === false) {
      let hasAnalyses = (reaction.container.children.filter(c => c.container_type === 'analyses')[0].children.length > 0);
      const startingMaterisls = (reaction.starting_materials || []);
      if (startingMaterisls.length < 1) {
        validates.push({ name: 'start_material', value: false, message: 'Start material is missing' });
      }
      startingMaterisls.forEach((st) => {
        if (!st.amount || !st.amount.value) {
          validates.push({ name: 'starting_materials-amount', value: false, message: `${st.molecule_iupac_name}: amount is 0` });
        }
      });
      const products = (reaction.products || []);
      if (products.length < 1) {
        validates.push({ name: 'product', value: false, message: 'Product is missing' });
      }
      products.forEach((pt) => {
        if (pt.analysisArray().length > 0) {
          hasAnalyses = true;
        }
        const validatePt = validateMolecule(pt);
        if (validatePt.length > 0) {
          validates.push(...validatePt);
        }
      });
      if (!hasAnalyses) {
        validates.push({ name: 'analyses', value: false, message: 'Analyses data is missing.' });
      }
    }

    if (validates.length > 0) {
      const updatedReaction = { ...reaction, validates };
      context.setState({ reaction: updatedReaction });
    } else {
      LoadingActions.start();
      RepositoryActions.reviewPublish(element);
    }
  }
}

export default ReactionDetailsRepoHelper;

import 'whatwg-fetch';
import Immutable from 'immutable';

import BaseFetcher from 'src/fetchers/BaseFetcher';
import Reaction from 'src/models/Reaction';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import Literature from 'src/models/Literature';
import GenericElsFetcher from 'src/fetchers/GenericElsFetcher';
import defaultAnalysisPublish from 'src/components/utils/defaultAnalysisPublish';
import ResearchPlansFetcher from 'src/fetchers/ResearchPlansFetcher';
import GasPhaseReactionActions from 'src/stores/alt/actions/GasPhaseReactionActions';

// TODO: Extract common base functionality into BaseFetcher
export default class ReactionsFetcher {
  static async fetchById(id) {
    try {
      const response = await fetch(`/api/v1/reactions/${id}.json`, {
        credentials: 'same-origin'
      }).then((response) => response.json())
        .then((json) => {
          const userLabels = json?.reaction?.tag?.taggable_data?.user_labels || null;
          if (json.hasOwnProperty('reaction')) {
            const reaction = new Reaction(json.reaction);
            const { catalystMoles, vesselSize } = reaction.findReactionVesselSizeCatalystMaterialValues();
            if (vesselSize) {
              GasPhaseReactionActions.setReactionVesselSize(vesselSize);
            }
            if (catalystMoles) {
              GasPhaseReactionActions.setCatalystReferenceMole(catalystMoles);
            }
            if (json.literatures && json.literatures.length > 0) {
              const tliteratures = json.literatures.map((literature) => new Literature(literature));
              const lits = tliteratures.reduce((acc, l) => acc.set(l.literal_id, l), new Immutable.Map());
              reaction.literatures = lits;
            }
            if (json.research_plans && json.research_plans.length > 0) {
              reaction.research_plans = json.research_plans;
            }
            reaction.updateMaxAmountOfProducts();
            reaction.publication = json.publication || {};
            if (userLabels != null) reaction.user_labels = userLabels;
            return new Reaction(defaultAnalysisPublish(reaction));
          }
          const rReaction = new Reaction(json.reaction);
          rReaction.publication = json.publication || {};
          if (userLabels != null) rReaction.setUserLabels(userLabels);
          if (json.error) {
            rReaction.id = `${id}:error:Reaction ${id} is not accessible!`;
          }
          return new Reaction(defaultAnalysisPublish(rReaction));
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
      const researchPlans = await ResearchPlansFetcher.fetchResearchPlansForElements(id, response.type);
      response.research_plans = researchPlans;
      return response;
    } catch (error) {
      console.error(error);
    }
  }

  static fetchByCollectionId(id, queryParams = {}, isSync = false) {
    return BaseFetcher.fetchByCollectionId(id, queryParams, isSync, 'reactions', Reaction);
  }

  static findByShortLabel(shortLabel) {
    return fetch(
      `/api/v1/reactions/findByShortLabel/${shortLabel}.json`,
      {
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }
      }
    ).then((response) => response.json()).catch((errorMessage) => console.log(errorMessage));
  }

  static create(reaction, method = 'post') {
    const newReaction = defaultAnalysisPublish(reaction);
    const reactionFiles = AttachmentFetcher.getFileListfrom(newReaction.container);
    let productsFiles = [];
    newReaction.products.forEach((prod) => {
      const files = AttachmentFetcher.getFileListfrom(prod.container);
      productsFiles = [...productsFiles, ...files];
    });
    const allFiles = reactionFiles.concat(productsFiles);

    const promise = () => fetch(`/api/v1/reactions/${method === 'post' ? '' : newReaction.id}`, {
      credentials: 'same-origin',
      method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newReaction.serialize())
    }).then((response) => response.json())
      .then((json) => GenericElsFetcher.uploadGenericFiles(newReaction, json.reaction.id, 'Reaction')
        .then(() => ReactionsFetcher.updateAnnotationsInReaction(newReaction))
        .then(() => this.fetchById(json.reaction.id))).catch((errorMessage) => {
        console.log(errorMessage);
      });

    if (allFiles.length > 0) {
      const tasks = [];
      allFiles.forEach((file) => tasks.push(AttachmentFetcher.uploadFile(file).then()));
      return Promise.all(tasks).then(() => promise());
    }

    return promise();
  }

  static updateAnnotationsInReaction(reaction) {
    const tasks = [];
    tasks.push(BaseFetcher.updateAnnotationsInContainer(reaction));
    reaction.products.forEach((e) => tasks.push(BaseFetcher.updateAnnotationsInContainer(e)));
    return Promise.all(tasks);
  }

  static update(reaction) {
    return ReactionsFetcher.create(reaction, 'put');
  }
}

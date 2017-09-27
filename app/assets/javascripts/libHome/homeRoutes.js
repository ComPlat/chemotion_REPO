import PublicActions from '../components/actions/PublicActions'
import PublicFetcher from '../components/fetchers/PublicFetcher'

const routes = {
  '/': 'root',
  target: {
    root: function(e) {
      Aviator.navigate('/home/welcome')
    }
  },

  '/welcome': {
    target: {
      show: function(e) {
        PublicActions.openRepositoryPage("welcome")
      },
    },
    '/': 'show'
  },

  '/home': {
    target: {
      show: function(e) {
        PublicActions.openRepositoryPage("home")
      },
    },
    '/': 'show'
  },
  '/publications': {
    target: {
      show: function(e) {
        PublicActions.openRepositoryPage("publications")
      },
    },
    '/': 'show'
  },
  '/review': {
    target: {
      show: function(e) {
        PublicActions.openRepositoryPage("review")
      },
    },
    '/': 'show'
  },
  '/about': {
    target: {
      show: function(e) {
        PublicActions.openRepositoryPage("about")
      },
    },
    '/': 'show'
  },
  '/contact': {
    target: {
      show: function(e) {
        PublicActions.openRepositoryPage("contact")
      },
    },
    '/': 'show'
  },

  '/newsroom': {
    target: {
      list: function (e) {
        PublicActions.articles();
      },
      show: function (e) {
        PublicActions.displayArticle(e.params.key)
      },
    },
    '/': 'list',
    '/:key': 'show'
  },

  '/newseditor': {
    target: {
      edit: function (e) {
        PublicActions.editArticle(e.params.key)
      },
      show: function (e) {
        PublicActions.editArticle('new')
      },
    },
    '/show': 'show',
    '/:key': 'edit'
  },

  '/howtoeditor': {
    target: {
      edit: function (e) {
        PublicActions.editHowTo(e.params.key)
      },
      show: function (e) {
        PublicActions.editHowTo('ein')
      },
    },
    '/show': 'show',
    '/:key': 'edit'
  },

  '/directive': {
    target: {
      show: function(e) {
        PublicActions.openRepositoryPage("directive")
      },
    },
    '/': 'show'
  },

  '/datasets': {
    target: {
      show: function(e) {
        PublicActions.displayDataset(e.params.datasetId)
      },
    },
    '/:datasetId': 'show'
  },

  '/molecules': {
    target: {
      show: function(e) {
        PublicActions.displayMolecule(e.params.moleculeId)
      },
    },
    '/:moleculeId': 'show'
  },

  '/reactions': {
    target: {
      show: function(e) {
        PublicActions.displayReaction(e.params.reactionId)
      },
    },
    '/:reactionId': 'show'
  },

  '/pid': {
    target: {
      show: function(e) {
        PublicFetcher.queryPid({id: e.params.id})
        }
    },
    '/:id': 'show'
  },

  '/inchikey': {
    target: {
      show: function(e) {
        let url = e.uri.replace("/inchikey/", "")
        let query = url.split(".")

        if (query.length > 0) {
          let version = query[1] || ""
          let splitIndex = query[0].indexOf("/")
          if (splitIndex < 0) splitIndex = query[0].length
          let params = {
            inchikey: query[0].substring(0, splitIndex),
            type:  query[0].substring(splitIndex + 1),
            version: version
          }

          PublicFetcher.queryInchikey(params)
        }

      },
    },
    '/*': 'show'
  },

  '/review_reaction': {
    target: {
      show: function(e) {
        PublicActions.displayReviewReaction(e.params.reactionId)
      },
    },
    '/:reactionId': 'show'
  },

  '/review_sample': {
    target: {
      show: function(e) {
        PublicActions.displayReviewSample(e.params.sampleId)
      },
    },
    '/:sampleId': 'show'
  },

  '/embargo': {
    target: {
      list: function (e) {
        PublicActions.openRepositoryPage("embargo");
      },
      show: function (e) {
        PublicActions.displayReviewEmbargo(e.params.elementType, e.params.elementId)
      },
    },
    '/': 'list',
    '/:elementType/:elementId': 'show'
  },

  '/howto': {
    target: {
      list: function (e) {
        PublicActions.howtos();
      },
      show: function (e) {
        PublicActions.displayHowTo(e.params.key)
      },
    },
    '/': 'list',
    '/:key': 'show'
  },
}

export default function() {
  Aviator.root = '/home'
  Aviator.pushStateEnabled = true
  Aviator.setRoutes(routes)
}

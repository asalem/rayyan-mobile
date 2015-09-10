angular.module('articles.controller', ['rayyan.services', 'rayyan.directives', 'rayyan.utils', 'ngCordova'])

.controller('ArticleController', function($rootScope, $scope, $stateParams,
  rayyanAPIService, rayyanHighlightsManager, $ionicSideMenuDelegate, $ionicPlatform,
  $ionicModal, $ionicScrollDelegate, $filter, $ionicPopup, $cordovaGoogleAnalytics) {
  
  var BATCH_SIZE = 5;
  var LONG_STR_LIMIT = 200
  var STANDARD_EXCLUSION_REASONS = [
    'wrong outcome',
    'wrong drug',
    'wrong population',
    'wrong publication type',
    'wrong study design',
    'wrong study duration',
    'foreign language',
    'background article'
  ]

  var reviewId = $stateParams.reviewId
  var review = $rootScope.review
  if (!review) {
    review = rayyanAPIService.getReview(reviewId)
    $rootScope.review = review
  }

  var originalArticleLabels, labelPrefix;
  var articlesOffset = 0;
  var articleToLabel;
  var highlights1Manager, highlights2Manager,
    titleSearchHighlightManager,
    authorSearchHighlightManager,
    abstractSearchHighlightManager,
    topicsSearchHighlightManager

  var trackView = function() {
    console.log("in trackView for Articles")
    if (window.cordova) {
      $ionicPlatform.ready(function() {
        $cordovaGoogleAnalytics.trackView('Articles');
      })
    }
  }

  $scope.articlesTotal = review.total_articles;

  var installFacets = function(facets) {
    if (facets.labels) {
      $scope.labels = _.pluck(facets.labels, 'display').sort()
    }
    if (facets.reasons) {
      var reasons = _.pluck(facets.reasons, 'display')
      console.log("reasons", reasons)
      $scope.reasons = _.uniq(reasons.concat(STANDARD_EXCLUSION_REASONS)).sort()
    }
    if (facets.highlights_1) {
      var keywords1 = _.pluck(facets.highlights_1, 'display')
      highlights1Manager = keywords1.length > 0 ? new rayyanHighlightsManager(keywords1, true) : null
    }
    if (facets.highlights_2) {
      var keywords2 = _.pluck(facets.highlights_2, 'display')
      highlights2Manager = keywords2.length > 0 ? new rayyanHighlightsManager(keywords2, true) : null
    }
  }

  $scope.limit = function(input) {
    if (input.length <= LONG_STR_LIMIT)
      return input
    else
      return $filter('limitTo')(input, LONG_STR_LIMIT) + '&hellip;'
  }

  // Begin modal filters view functions
  $ionicModal.fromTemplateUrl('templates/facets.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function(modal) {
    $scope.filtersView = modal;
  });
  $scope.filterIconClicked = function() {
    $scope.filtersView.show();

    // force refresh all facets remotely
    rayyanAPIService.getFacets(review, null, "remote")
      .then(function(facets){
        installFacets(facets)
        // update modal
        $scope.$broadcast('facets.updated');
      })
  };
  $rootScope.getReviewFacets = function(facetType) {
    return review.filters[facetType]
  }

  $rootScope.applyFacets = function(facetValues) {
    var facetCount = _.size(facetValues)
    console.log("applying facets", facetCount, facetValues)

    var prepareHighlightsManager = function(facetType, useHighlightFacetTypes) {
      if (facetCount > 0 && (
        !_.isEmpty(facetValues.search) ||
        !_.isEmpty(facetValues[facetType]) || 
        useHighlightFacetTypes && (
          !_.isEmpty(facetValues.highlights_1) || 
          !_.isEmpty(facetValues.highlights_2) ||
          !_.isEmpty(facetValues.topics) ))) {
            return new rayyanHighlightsManager(_.flatten([
              facetValues.search, 
              facetValues[facetType],
              facetValues.highlights_1,
              facetValues.highlights_2,
              facetValues.topics]))
      }
      else
        return null      
    }

    // prepare highlight managers for search
    titleSearchHighlightManager = prepareHighlightsManager("titleSearch", true)
    abstractSearchHighlightManager = prepareHighlightsManager("abstractSearch", true)
    authorSearchHighlightManager = prepareHighlightsManager("authorSearch")
    topicsSearchHighlightManager = prepareHighlightsManager("topics", true)

    articlesOffset = 0
    $scope.facetCount = facetCount
    $scope.facetValues = facetValues
    $scope.noMoreArticlesAvailable = false;
    // articles = [] will automatically trigger loadMore() because noMoreArticlesAvailable re-enabled infiniteScroll
    // <3 AgularJS
    $scope.articles = []
    $ionicScrollDelegate.$getByHandle('articlesContent').scrollTop();
    $scope.filtersView.hide();

    trackView()
  };
  //Cleanup the modal when we're done with it!
  $scope.$on('$destroy', function() {
    $scope.filtersView.remove();
  });
  // Execute action on hide modal
  $scope.$on('modal.hidden', function() {
    // Execute action
  });
  // Execute action on remove modal
  $scope.$on('modal.removed', function() {
    // Execute action
  });
  $scope.facetCount = 0
  // End modal filters view functions

  rayyanAPIService.getFacets(review, null, "local")
    .then(function(facets){
      installFacets(facets)
      rayyanAPIService.getFacets(review)
        .then(installFacets)
    })

  var highlightField = function(manager, input, klass) {
    return manager ? manager.highlight(input, klass || "highlight-category-search", true) : input
  }

  $scope.highlight1 = function(input) {
    return highlightField(highlights1Manager, input, "highlight-category-1")
  }
  $scope.highlight2 = function(input) {
    return highlightField(highlights2Manager, input, "highlight-category-2")
  }
  $scope.highlightTitle = function(input) {
    return highlightField(titleSearchHighlightManager, input)
  }
  $scope.highlightAuthors = function(input) {
    return highlightField(authorSearchHighlightManager, input)
  }
  $scope.highlightAbstract = function(input) {
    return highlightField(abstractSearchHighlightManager, input)
  }
  $scope.highlightTopics = function(input) {
    return highlightField(topicsSearchHighlightManager, input)
  }

  $scope.showBlind = review.users_count > 1

  var appendArticlesToScope = function(articles) {
    _.each(articles, function(article){
      $scope.articles.push(article);
    })
    articlesOffset += articles.length
  }

  $scope.loadMore = function() {
    console.log("in loadMore, facetValues", $scope.facetValues)
    $scope.errorLoadingMore = false;
    $scope.download_pending = false;
    $scope.no_remote_filtering = false;

    rayyanAPIService.getArticles(review, articlesOffset, BATCH_SIZE, $scope.facetValues)
      .then(function(articles){
        $scope.articlesTotal = articles.pop()
        console.log("resolved by articles", articles)
        if (articles.length == 0)
          $scope.noMoreArticlesAvailable = true;
        else
          appendArticlesToScope(articles)
      }, function(error){
        $scope.noMoreArticlesAvailable = true;
        switch(error) {
          case "download_pending":
            $scope.download_pending = true
          break;
          case "no_remote_filtering":
            $scope.no_remote_filtering = true
          break;
          default:
            $scope.errorLoadingMore = true;
        }
      }, function(articles){
        $scope.articlesTotal = articles.pop()
        console.log("notified by articles", articles)
        appendArticlesToScope(articles);
      })
      .finally(function(){
        $scope.$broadcast('scroll.infiniteScrollComplete');
      })
  };
  
  $scope.articles = [];

  $scope.blindIcon = function() {
    return review.blind ? 'ion-eye-disabled' : 'ion-eye'
  }

  $scope.blindClicked = function() {
    if (review.owner) {
      var next = review.blind ? "" : "NOT "
      $ionicPopup.confirm({
        title: "Changing blind mode to " + (review.blind ? "off" : "on"),
        template: "This will make decisions and labels of any collaborator " + next
          + "visible to others. Are you sure you want to continue?"
      }).then(function(confirmed){
        if (confirmed) rayyanAPIService.toggleBlind(review);
      })
    }
    else {
      $ionicPopup.alert({
        title: "Blind mode is " + (review.blind ? "on" : "off"),
        template: "Only review owner can change the blind mode."
      })
    }
  }

  var generateLabelModels = function(reviewLabels, articleLabels) {
    console.log("in generateLabelModels", reviewLabels, articleLabels)
    var models = _.reduce(articleLabels || [], function(hash, label){
      hash[label] = true; return hash
    }, {})
    _.each(reviewLabels || [], function(label){
      if (!models[label]) models[label] = false
    })
    return models
  }

  var updatePendingJournalActionsCount = function(increment) {
    $rootScope.pendingActionsCount += increment;
    console.log("incrementing pendingActionsCount by", increment)
  }

  var applyCustomization = function(review, article, plan) {
    var notified = 0
    rayyanAPIService.applyCustomization(review, article, plan)
      .then(
        function(count) { // update on success
          updatePendingJournalActionsCount(count - notified)
        },
        function(count) { // update on failure
          updatePendingJournalActionsCount(count - notified)
        },
        function(count) { // update on notify
          notified = count
          updatePendingJournalActionsCount(count)
        }
      )
  }

  var applyLabelModels = function(labelModels, originalArticleLabels, labelPrefix) {
    var plan = {}

    var pushAction = function(label, value) {
      plan[labelPrefix + label] = value
    }

    _.each(originalArticleLabels, function(label){
      if (labelModels[label])
        delete labelModels[label]
      else
        pushAction(label, -1)
    })
    _.each(labelModels, function(value, label){
      if (value) {
        pushAction(label, 1);
        // append label to $scope.labels or $scope.reasons if new, so that it appears for other articles
        if (!_.contains($rootScope.originalReviewLabels)) {
          $rootScope.originalReviewLabels.push(label)
          $rootScope.originalReviewLabels.sort()
        }
      }
    })

    // send plan to rayyanAPIservice and refresh menu
    console.log("labeling plan", plan)
    applyCustomization(review, articleToLabel, plan)
  }

  $scope.labelClicked = function(article) {
    console.log("label clicked for article", article)
    originalArticleLabels = article.labels
    labelPrefix = ""
    $rootScope.originalReviewLabels = $scope.labels
    $rootScope.labelModels = generateLabelModels(
      $rootScope.originalReviewLabels, originalArticleLabels)
    $rootScope.labels = _.uniq($scope.labels.concat(originalArticleLabels))
    $rootScope.labelsTitle = 'Labels'
    $rootScope.labelsTitleClass = 'positive'
    articleToLabel = article
    console.log("scopeModels", $rootScope.labelModels)
    $ionicSideMenuDelegate.toggleRight()
  }

  $scope.reasonClicked = function(article) {
    console.log("reason clicked for article", article)
    originalArticleLabels = article.reasons
    labelPrefix = "__EXR__"
    $rootScope.originalReviewLabels = $scope.reasons
    $rootScope.labelModels = generateLabelModels(
      $scope.reasons, originalArticleLabels)
    $rootScope.labels = _.uniq($scope.reasons.concat(originalArticleLabels))
    $rootScope.labelsTitle = 'Exclusion Reasons'
    $rootScope.labelsTitleClass = 'assertive'
    articleToLabel = article
    console.log("scopeModels", $rootScope.labelModels)
    $ionicSideMenuDelegate.toggleRight()
  }

  $scope.includedClicked = function(article, value) {
    applyCustomization(review, article, {included: value})
  }

  $scope.$watch(function() {return $ionicSideMenuDelegate.isOpen(); }, function(isOpen, wasOpen) {
    if (!isOpen && wasOpen) {
      // menu closed, apply labels
      applyLabelModels($rootScope.labelModels, originalArticleLabels, labelPrefix)
    }
    else if (isOpen && !wasOpen) {
      // menu opened
      $scope.$emit("menuOpen")
    }
  })

  $scope.$on('$ionicView.enter', function(e) {
    trackView()
  });

});

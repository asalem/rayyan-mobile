angular.module('articles.controller', ['rayyan.services', 'rayyan.directives'])

.controller('ArticleController', function($rootScope, $scope, $stateParams, rayyanAPIService, $ionicSideMenuDelegate, $ionicModal) {
  var BATCH_SIZE = 10;
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

  // Begin modal filters view functions
  $ionicModal.fromTemplateUrl('templates/facets.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function(modal) {
    $scope.filtersView = modal;
  });
  $scope.openFiltersView = function() {
    $scope.filtersView.show();
  };
  $rootScope.applyFacets = function(facetCount) {
    console.log("applying facets", facetCount)
    $scope.facetCount = facetCount
    $scope.filtersView.hide();
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

  var processLabels = function(labels) {
    var partitions = _.partition(labels, function(label){
      return M.labelPredicate(label)
    })
    return {
      labels: partitions[0],
      reasons: _.map(partitions[1], function(reason){return M.cleanExclusionReason(reason)})
    }
  }

  // TODO persist labels per review
  rayyanAPIService.getLabels(reviewId)
    .then(function(labels){
      var processedLabels = processLabels(labels)
      $scope.labels = processedLabels.labels
      $scope.reasons = _.uniq(processedLabels.reasons.concat(STANDARD_EXCLUSION_REASONS)).sort()
    })

  $scope.showBlind = review.users_count > 1

  // load articles
  $scope.noMoreArticlesAvailable = false;
  
  var appendArticlesToScope = function(articles) {
    _.each(articles, function(article){
      $scope.articles.push(article);
    })
    articlesOffset += articles.length
  }

  $scope.loadMore = function() {
    console.log("in loadMore")
    $scope.errorLoadingMore = false;
    $scope.download_pending = false;

    rayyanAPIService.getArticles(review, articlesOffset, BATCH_SIZE)
      .then(function(articles){
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
          default:
            $scope.errorLoadingMore = true;
        }
      }, function(articles){
        console.log("notified by articles", articles)
        appendArticlesToScope(articles);
      })
      .finally(function(){
        $scope.$broadcast('scroll.infiniteScrollComplete');
      })
  };
  
  $scope.articles = [];

  $scope.blindIcon = function() {
    return review.is_blind ? 'ion-eye-disabled' : 'ion-eye'
  }

  $scope.blindClicked = function() {
    if (!review.owner)
      alert("Only the review owner can change the blind mode")
    else {
      var next = review.is_blind ? "" : "NOT "
      if (confirm("This will make decisions and labels of any collaborator "+next+"visible to others. Are you sure you want to continue?"))
        rayyanAPIService.toggleBlind(reviewId)
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
      if (value) pushAction(label, 1);
    })

    // send plan to rayyanAPIservice and refresh menu
    console.log("labeling plan", plan)
    applyCustomization(review, articleToLabel, plan)
  }

  $scope.labelClicked = function(article) {
    console.log("label clicked for article", article)
    originalArticleLabels = article.labels
    labelPrefix = ""
    $rootScope.labelModels = generateLabelModels(
      $scope.labels, originalArticleLabels)
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

});

angular.module('articles.controller', ['rayyan.services'])

.controller('ArticleController', function($rootScope, $scope, $stateParams, rayyanAPIService, $ionicSideMenuDelegate) {
  var BATCH_SIZE = 3;
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
  if (!review)
    review = rayyanAPIService.getReview(reviewId)

  var originalArticleLabels, labelPrefix
  var articlesOffset = 0;

  $scope.review = review
  
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
    rayyanAPIService.getArticles(review, articlesOffset, BATCH_SIZE)
      .then(function(articles){
        console.log("resolved by articles", articles)
        if (articles.length == 0)
          $scope.noMoreArticlesAvailable = true;
        else
          appendArticlesToScope(articles)
      }, null, function(articles){
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

  var applyLabelModels = function(labelModels, originalArticleLabels, labelPrefix) {
    var plan = []
    _.each(originalArticleLabels, function(label){
      if (labelModels[label])
        delete labelModels[label]
      else
        plan.push({key: labelPrefix + label, value: -1})
    })
    _.each(labelModels, function(value, label){
      if (value) plan.push({key: labelPrefix + label, value: 1})
    })
    // TODO send plan to rayyanAPIservice and refresh menu (automagically?)
    console.log("labeling plan", plan)
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
    console.log("scopeModels", $rootScope.labelModels)
    $ionicSideMenuDelegate.toggleRight()
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

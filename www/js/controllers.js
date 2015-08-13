angular.module('rayyan.controllers', ['rayyan.services'])

.controller('AppCtrl', function($scope, $ionicModal, $http) {

  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //$scope.$on('$ionicView.enter', function(e) {
  //});

})

.controller('LoginCtrl', function($scope, $http, $location, $localStorage, rayyanAPIService) {
  $scope.loggedIn = rayyanAPIService.loggedIn;
  $scope.getDisplayName = rayyanAPIService.getDisplayName;
  $scope.login = rayyanAPIService.login
  $scope.logout = function(){
    $scope.reviews = []
    rayyanAPIService.logout()
  }
})

.controller('ReviewsCtrl', function($scope, $location, $localStorage, rayyanAPIService) {

  $scope.doRefresh = function() {
    rayyanAPIService.getReviews()
      .then(function(reviews){
        console.log("in controller, data: ", reviews)
        $scope.reviews = reviews
      })
      .finally(function(){
        //Stop the ion-refresher from spinning
        $scope.$broadcast('scroll.refreshComplete');
      })
  }

  if (rayyanAPIService.loggedIn())
    $scope.doRefresh()

  $scope.$on('$ionicView.enter', function(e) {
    if (!rayyanAPIService.loggedIn()) {
      $location.path("/app/login")
    }
    else {
      $scope.reviews = rayyanAPIService.getCachedReviews()
    }
  });

  $scope.reviewClicked = function(reviewId) {
    $location.path("/app/reviews/"+reviewId+"/article")
  }
})

.controller('ArticleCtrl', function($rootScope, $scope, $stateParams, rayyanAPIService, $ionicScrollDelegate, $ionicSideMenuDelegate) {
  var reviews = rayyanAPIService.getCachedReviews()
  var reviewId = $stateParams.reviewId
  var review = _.find(reviews, function(r) {return r.id == reviewId})
  var originalArticleLabels, labelPrefix
  $scope.review = review
  $scope.facets = review.facets || {}

  rayyanAPIService.getFacets(reviewId)
    .then(function(facets){
      $scope.facets = facets
    })

  $scope.article = rayyanAPIService.getNextArticle(reviewId)
  $scope.showBlind = review.users_count > 1

  $scope.blindIcon = function() {
    return review.blind ? 'ion-eye-disabled' : 'ion-eye'
  }

  $scope.blindClicked = function() {
    if (!review.owner)
      alert("Only the review owner can change the blind mode")
    else {
      var next = review.blind ? "" : "NOT "
      if (confirm("This will make decisions and labels of any collaborator "+next+"visible to others. Are you sure you want to continue?"))
        rayyanAPIService.toggleBlind(reviewId)
    }
  }

  var generateLabelModels = function(reviewLabels, articleLabels) {
    var models = _.reduce(articleLabels || [], function(hash, label){
      hash[label] = true; return hash
    }, {})
    _.each(reviewLabels || [], function(labelFacetRow){
      if (!models[labelFacetRow.display]) models[labelFacetRow.display] = false
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

  $scope.labelClicked = function() {
    originalArticleLabels = $scope.article.labels
    labelPrefix = ""
    $rootScope.labelModels = generateLabelModels(
      $scope.facets.labels, originalArticleLabels)
    $rootScope.labels = _.pluck($scope.facets.labels, 'display')
    $rootScope.labelsTitle = 'Labels'
    $rootScope.labelsTitleClass = 'positive'
    $ionicSideMenuDelegate.toggleRight()
  }

  $scope.reasonClicked = function() {
    originalArticleLabels = $scope.article.reasons
    labelPrefix = "__EXR__"
    $rootScope.labelModels = generateLabelModels(
      $scope.facets.reasons, originalArticleLabels)
    $rootScope.labels = _.pluck($scope.facets.reasons, 'display')
    $rootScope.labelsTitle = 'Exclusion Reasons'
    $rootScope.labelsTitleClass = 'assertive'
    $ionicSideMenuDelegate.toggleRight()
  }

  $scope.$watch(function() {return $ionicSideMenuDelegate.isOpen(); }, function(isOpen, wasOpen) {
    if (!isOpen && wasOpen) {
      // menu closed, apply labels
      applyLabelModels($rootScope.labelModels, originalArticleLabels, labelPrefix)
    }
    else if (isOpen && !wasOpen) {
      // menu opened, scroll to top
      $scope.$emit("menuOpen")
      $ionicScrollDelegate.$getByHandle('labelsContent').scrollTop(false)
    }
  })

  $scope.advance = function(forward) {
    if (forward)
      $scope.article = rayyanAPIService.getNextArticle(reviewId)
    else
      $scope.article = rayyanAPIService.getPreviousArticle(reviewId)
    // TODO: inside a promise
    $ionicScrollDelegate.scrollTop(true);
  }
})

.controller('LabelsCtrl', function($rootScope, $scope, $ionicScrollDelegate) {
  $rootScope.$on('menuOpen', function(e) {
    $scope.searchCriteria = ''  
  })

  var searchCriteriaLower, searchCriteriaRegexExact
  $scope.filterAndDetectExactMatch = function(label, index) {
    if (index == 0) {
      $scope.exactMatch = false
      searchCriteriaRegex = new RegExp($scope.searchCriteria, "i")
      searchCriteriaRegexExact = new RegExp("^" + $scope.searchCriteria + "$", "i")
      $ionicScrollDelegate.scrollTop()
    }
    if (label.match(searchCriteriaRegexExact))
      return $scope.exactMatch = true
    else
      return label.match(searchCriteriaRegex)
  }
})

.filter("nbsp", function(){
  return function(input) {
    return input.replace(/\s+/g, '_')
  }
})

;
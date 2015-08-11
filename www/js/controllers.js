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
        $scope.reviews = reviews
      }, function(error){
        alert("Error retrieving reviews")
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
    console.log(reviewId)
  }
})

.controller('ArticleCtrl', function($scope, $stateParams) {
});

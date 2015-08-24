angular.module('reviews.controller', ['rayyan.services'])

.controller('ReviewsController', function($rootScope, $scope, $location, rayyanAPIService) {

  var redirectedToLogin = false;

  $scope.doRefresh = function() {
    rayyanAPIService.getReviews()
      .then(function(reviews){
        // remote reviews
        $scope.reviews = reviews
      }, null, function(reviews){
        // local reviews
        $scope.reviews = reviews
      })
      .finally(function(){
        //Stop the ion-refresher from spinning
        $scope.$broadcast('scroll.refreshComplete');
      })
  }

  $scope.$on('$ionicView.enter', function(e) {
    if (!rayyanAPIService.loggedIn()) {
      redirectedToLogin = true;
      $location.path("/app/login")
      // TODO what if user starts on login or visits it explicitly then signout then in?
      // reviews wont auto refresh in such case
    } else if (redirectedToLogin) {
      redirectedToLogin = false;
      $scope.doRefresh();
    }
  });

  if (rayyanAPIService.loggedIn())
    $scope.doRefresh()

  $scope.reviewClicked = function(reviewId) {
    $rootScope.review = _.find($scope.reviews, function(r){return r.rayyan_id == reviewId})
    $location.path("/app/reviews/"+reviewId+"/articles")
  }

});
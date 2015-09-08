angular.module('login.controller', ['rayyan.services'])

.controller('LoginController', function($rootScope, $scope, rayyanAPIService, $ionicPlatform) {
  $scope.loggedIn = rayyanAPIService.loggedIn;
  $scope.getDisplayName = rayyanAPIService.getDisplayName;
  $scope.login = function(demo) {
    rayyanAPIService.login(demo)
      .then(function(){
        $rootScope.refreshReviews()
      })
  }
  $scope.logout = function() {
    $rootScope.reviews = []
    rayyanAPIService.logout()
  }
});
angular.module('login.controller', ['rayyan.services'])

.controller('LoginController', function($rootScope, $scope, rayyanAPIService, $ionicPlatform) {
  $scope.loggedIn = rayyanAPIService.loggedIn;
  $scope.getDisplayName = rayyanAPIService.getDisplayName;
  $scope.login = function() {
    rayyanAPIService.login()
      .then(function(){
        $rootScope.refreshReviews()
      })
  }
  $scope.logout = function() {
    $rootScope.reviews = []
    rayyanAPIService.logout()
  }

  $scope.menuClicked = function(url) {
    $ionicPlatform.ready(function(){
      (window.cordova ? cordova.InAppBrowser : window).open(url, '_system');
    })
  }
});
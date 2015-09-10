angular.module('login.controller', ['rayyan.services', 'ngCordova'])

.controller('LoginController', function($rootScope, $scope, rayyanAPIService, $ionicPlatform, $cordovaGoogleAnalytics) {
  $scope.loggedIn = rayyanAPIService.loggedIn;
  $scope.getDisplayName = rayyanAPIService.getDisplayName;
  $scope.login = function(demo) {
    rayyanAPIService.login(demo)
      .then(function(){
        $rootScope.refreshReviews()
        if (window.cordova) {
          $ionicPlatform.ready(function() {
            var userId = rayyanAPIService.getUserId()
            if (userId) {
              console.log("setting userId for GA", userId)
              $cordovaGoogleAnalytics.setUserId(userId);
            }
          })
        }
      })
  }
  $scope.logout = function() {
    $rootScope.reviews = []
    rayyanAPIService.logout()
    if (window.cordova) {
      $ionicPlatform.ready(function() {
        $cordovaGoogleAnalytics.setUserId(0);
      })
    }
  }
});
angular.module('menu.controller', ['rayyan.services', 'ngCordova'])

.controller('MenuController', function($scope, rayyanAPIService, $ionicPlatform, $cordovaSocialSharing) {
  $scope.loggedIn = rayyanAPIService.loggedIn;
  $scope.getDisplayName = rayyanAPIService.getDisplayName;

  $scope.openLink = function(url) {
    $ionicPlatform.ready(function(){
      (window.cordova ? cordova.InAppBrowser : window).open(url, '_system');
    })
  }

  $scope.shareApp = function() {
    if (window.cordova) {
      var subject = "Download Rayyan QCRI mobile app for free"
      var message = "Rayyan QCRI is a free mobile/web app to help systematic review authors (offline) screen citations quickly @rayyanapp"
      var link = "http://rayyan.qcri.org"
      $cordovaSocialSharing.share(message, subject, null, link);
    }
    else
      alert("This does not work in browser, try a mobile simulator/device")
  }

});
angular.module('menu.controller', ['rayyan.services', 'ngCordova'])

.controller('MenuController', function($scope, rayyanAPIService, $ionicPlatform, $cordovaSocialSharing, $cordovaGoogleAnalytics) {
  $scope.loggedIn = rayyanAPIService.loggedIn;
  $scope.getDisplayName = rayyanAPIService.getDisplayName;

  var trackEvent = function(action) {
    $ionicPlatform.ready(function() {
      if (window.cordova)
        $cordovaGoogleAnalytics.trackEvent('Menu', action)
    })
  }
  
  if (window.cordova) {
    $ionicPlatform.ready(function() {
      var userId = rayyanAPIService.getUserId()
      if (userId) {
        console.log("setting initial userId for GA", userId)
        $cordovaGoogleAnalytics.setUserId(userId);
      }
    })
  }

  $scope.openLink = function(action, url) {
    $ionicPlatform.ready(function(){
      if (window.cordova) {
        cordova.InAppBrowser.open(url, '_system')
        trackEvent(action)
      }
      else
        window.open(url, '_system');
    })
  }

  $scope.shareApp = function() {
    if (window.cordova) {
      var subject = "Download Rayyan QCRI mobile app for free"
      var message = "Rayyan QCRI is a free mobile/web app to help systematic review authors (offline) screen citations quickly @rayyanapp"
      var link = "http://rayyan.qcri.org"
      $cordovaSocialSharing.share(message, subject, null, link);
      trackEvent('share_app')
    }
    else
      alert("This does not work in browser, try a mobile simulator/device")
  }

});
// Ionic Rayyan App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'rayyan' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'rayyan.controllers' is found in controllers.js
angular.module('rayyan', ['ionic', 'ngStorage', 'ngCordova', 
  'ngIOS9UIWebViewPatch', 'angularLoad', 'rayyan.controllers', 'rayyan.services'])

.run(function($rootScope, $ionicPlatform, rayyanAPIService, $cordovaGoogleAnalytics, angularLoad) {

  var platform = ionic.Platform.platform();
  switch(platform) {
    case "android":
    case "ios":
    // add more supported platforms here if they have css in /scss folder
    default:
      platform = "ios";
  }
  angularLoad.loadCSS("css/ionic.app."+platform+".min.css")

  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      cordova.plugins.Keyboard.disableScroll(true);
    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }
    rayyanAPIService.init()
      .then(function(){
        // broadcast rayyan service ready
        $rootScope.$broadcast("rayyan.ready")
      })

    // Google Analytics
    if (window.cordova) {
      $cordovaGoogleAnalytics.startTrackerWithId('UA-55160701-4');
      // TODO remove debug later
      $cordovaGoogleAnalytics.debugMode();
    }
  });
})

.config(function($stateProvider, $urlRouterProvider) {
  $stateProvider

  .state('app', {
    url: '/app',
    abstract: true,
    templateUrl: 'templates/menu.html',
    controller: 'AppController'
  })

  .state('app.login', {
    url: '/login',
    views: {
      'menuContent': {
        templateUrl: 'templates/login.html',
        controller: 'LoginController'
      }
    }
  })

  .state('app.reviews', {
    url: '/reviews',
    views: {
      'menuContent': {
        templateUrl: 'templates/reviews.html',
        controller: 'ReviewsController'
      }
    }
  })

  .state('app.articles', {
    url: '/reviews/:reviewId/articles',
    views: {
      'menuContent': {
        templateUrl: 'templates/articles.html',
        controller: 'ArticleController'
      }
    }
  })

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/app/reviews');
});

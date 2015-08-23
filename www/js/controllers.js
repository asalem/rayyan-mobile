angular.module('rayyan.controllers', ['login.controller', 'reviews.controller', 'articles.controller', 'labels.controller'])

.controller('AppController', function($scope, $ionicModal, $http) {

  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //$scope.$on('$ionicView.enter', function(e) {
  //});

})

.filter("nbsp", function(){
  return function(input) {
    return input.replace(/\s+/g, '_')
  }
})

;
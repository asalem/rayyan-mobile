angular.module('login.controller', ['rayyan.services'])

.controller('LoginController', function($scope, rayyanAPIService) {
  $scope.loggedIn = rayyanAPIService.loggedIn;
  $scope.getDisplayName = rayyanAPIService.getDisplayName;
  $scope.login = rayyanAPIService.login
  $scope.logout = rayyanAPIService.logout
});
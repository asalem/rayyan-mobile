angular.module('labels.controller', [])

.controller('LabelsController', function($rootScope, $scope, $ionicScrollDelegate) {

  $rootScope.$on('menuOpen', function(e) {
    $scope.searchCriteria = ''  
  })

  var searchCriteriaLower, searchCriteriaRegexExact
  $scope.filterAndDetectExactMatch = function(label, index) {
    if (index == 0) {
      $scope.exactMatch = false
      searchCriteriaRegex = new RegExp($scope.searchCriteria, "i")
      searchCriteriaRegexExact = new RegExp("^" + $scope.searchCriteria + "$", "i")
      $ionicScrollDelegate.$getByHandle('labelsContent').scrollTop()
    }
    if (label.match(searchCriteriaRegexExact))
      return $scope.exactMatch = true
    else
      return label.match(searchCriteriaRegex)
  }

});
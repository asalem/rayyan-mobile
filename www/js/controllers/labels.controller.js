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

  $scope.newLabelChanged = function(label, value, labels) {
    // append the new label to the volatile list so that it is listed later as being existant
    if (value) labels.push(label)
  }
});
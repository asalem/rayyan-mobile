angular.module('facets.controller', [])

.controller('FacetsController', function($rootScope, $scope, $ionicScrollDelegate) {

  $scope.$on('modal.shown', function(e) {
    $ionicScrollDelegate.$getByHandle('facetsContent').scrollTop();
  })

  var countCriteria = function(criteria) {
    return _.isUndefined(criteria) || criteria == '' ? 0 : 1
  }

  $scope.applyFacets = function() {
    var facetCount = $scope.topicsFacet.hasSelection
    + $scope.highlightsFacet.hasSelection
    + $scope.inclusionsFacet.hasSelection
    + $scope.labelsFacet.hasSelection
    + $scope.reasonsFacet.hasSelection
    + countCriteria($scope.searchFacet.criteria)
    + countCriteria($scope.titleSearchFacet.criteria)
    + countCriteria($scope.abstractSearchFacet.criteria)
    + countCriteria($scope.authorSearchFacet.criteria);

    // TODO send also facet selected objects
    $rootScope.applyFacets(facetCount)
  }
  
  $scope.searchFacet = {
    search: true
  }

  $scope.topicsFacet = {
    title: "Topics",
    items: [
      {
        value: 1,
        display: "Topic 1",
        count: 10,
        selected: false
      },
      {
        value: 2,
        display: "Topic 2",
        count: 5,
        selected: false
      },
    ]
  }

  $scope.highlightsFacet = {
    title: "Highlights",
    items: [
      {
        value: 1,
        display: "Highlight 1",
        count: 10,
        selected: false
      },
      {
        value: 2,
        display: "Highlight 2",
        count: 10,
        selected: false
      }
    ]
  }

  $scope.inclusionsFacet = {
    title: "Inclusion decisions",
    single: true,
    items: $rootScope.review.inclusions
  }

  $scope.labelsFacet = {
    title: "Labels",
    items: [
      {
        value: "Label 1",
        display: "Label 1",
        count: 7,
        selected: false
      },
    ]
  }

  $scope.reasonsFacet = {
    title: "Exclusion reasons",
    items: [
      {
        value: "Reason 1",
        display: "Reason 1",
        count: 20,
        selected: false
      },
      {
        value: "Reason 2",
        display: "Reason 2",
        count: 10,
        selected: false
      }
    ]
  }

  $scope.titleSearchFacet = {
    title: "Titles",
    search: true
  }

  $scope.abstractSearchFacet = {
    title: "Abstracts",
    search: true
  }

  $scope.authorSearchFacet = {
    title: "Authors",
    search: true
  }

})

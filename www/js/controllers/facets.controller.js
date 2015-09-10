angular.module('facets.controller', ['ngCordova'])

.controller('FacetsController', function($rootScope, $scope, $ionicScrollDelegate, $ionicPlatform, $cordovaGoogleAnalytics) {

  var searchFacets = {
    search: 'All',
    titleSearch: 'Titles',
    abstractSearch: 'Abstracts',
    authorSearch: 'Authors'
  }

  var listFacets = {
    topics: "Topics",
    highlights_1: "Keywords for include",
    highlights_2: "Keywords for exclude",
    inclusions: "Inclusion decisions",
    labels: "Labels",
    reasons: "Exclusion reasons"
  }

  var trackView = function() {
    console.log("in trackView for Filters")
    if (window.cordova) {
      $ionicPlatform.ready(function() {
        $cordovaGoogleAnalytics.trackView('Filters');
      })
    }
  }

  var updateListFacetsItems = function() {
    console.log("Now updating facets widgets")
    // update list facet items with new items, preserving old selections
    var oldSelectedValues = getSelectedListValues()
    _.each(listFacets, function(title, name){
      var oldItems = $scope[name].items
      $scope[name].items = $rootScope.getReviewFacets(name)
      if (oldItems) {
        _.each($scope[name].items, function(item){
          if (oldSelectedValues[name] && oldSelectedValues[name][item.value])
            item.selected = true
        })
      }
    })
  }

  var getSelectedListValues = function() {
    // returns an object of selected list facet values
    // e.g. {topics: {val1: 1, val2: 1, ...}, inclusions: {val1: 1}, ...}
    return _.reduce(listFacets, function(hash, title, name){
      var selectedValues = {}
      _.each($scope[name].items, function(item){
        if (item.selected)
          selectedValues[item.value] = 1
      })
      if (!_.isEmpty(selectedValues))
        hash[name] = selectedValues
      return hash
    }, {})
  }

  var getSearchValues = function() {
    // returns an object of search facet criteria
    // e.g. {search: "q1", authorSearch: "q2", ...}
    return _.reduce(searchFacets, function(hash, title, name){
      var q = $scope[name].criteria
      if (!_.isEmpty(q))
        hash[name] = q
      return hash
    }, {})
  }

  $scope.applyFacets = function() {
    // trigger faceted search on rootScope
    $rootScope.applyFacets(_.extend(
      getSearchValues(),
      _.reduce(getSelectedListValues(), function(hash, values, name){
        var keys = _.keys(values)
        hash[name] = $scope[name].single ? keys[0] : keys
        return hash
      }, {})
    ))
  }
  
  // set facet variables in $scope
  _.each(searchFacets, function(title, name){
    $scope[name] = {
      title: title,
      search: true
    }
  })

  _.each(listFacets, function(title, name){
    $scope[name] = {
      title: title
    }
  })
  $scope.inclusions.single = true

  $scope.$on('modal.shown', function(e) {
    $ionicScrollDelegate.$getByHandle('facetsContent').scrollTop();
    updateListFacetsItems()
    trackView()
  })
  
  $scope.$on('facets.updated', function(e) {
    updateListFacetsItems()
  })

})

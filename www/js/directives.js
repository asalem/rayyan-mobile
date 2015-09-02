angular.module('rayyan.directives', [])

.directive('rynFacet', function() {

  var link = function(scope, element, attribs) {
    scope.facetHidden = true

    scope.checkboxChanged = function(changedItem) {
      if (scope.facet.single && changedItem.selected) {
        _.each(scope.facet.items, function(item){
          if (item !== changedItem) item.selected = false;
        })
      }
    }

    scope.shouldHideClearButton = function() {
      var hidden = _.isUndefined(_.find(scope.facet.items, function(item){return item.selected}))
      scope.facet.hasSelection = hidden ? 0 : 1
      return hidden
    }

    scope.clearItems = function($event) {
      $event.preventDefault();
      $event.stopPropagation();
      _.each(scope.facet.items, function(item){
        item.selected = false
      })
      scope.facetHidden = true
    }

  }

  return {
    restrict: 'E',
    scope: {
      facet: "="
    },
    templateUrl: 'templates/directives/ryn-facet.html',
    link: link
  };
});
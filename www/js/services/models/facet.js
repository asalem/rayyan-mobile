M.Facet = persistence.define('Facet', {
  review_id: "INT",
  type: "TEXT",
  value: "TEXT",
  display: "TEXT",
  count: "INT"
});

M.Review.hasMany('facets', M.Facet, 'review')

M.capitalize = function(str) {
  return str.charAt(0).toUpperCase() + str.substring(1).toLowerCase();
}

M.getFacet = function(review, facetType, $q) {
  var deferred = $q.defer()
  review.facets
    .filter("type", "=", facetType)
    .order(facetType == "inclusions" ? "display" : "count", false)
    .list(null, function(facetRows){
      deferred.resolve(_.map(facetRows, function(facetRow){
        return _.pick(facetRow, 'value', 'display', 'count')
      }));
    })
  return deferred.promise
}

M.setFacet = function(review, facetType, facet, $q) {
  var deferred = $q.defer();

  review.facets
    .filter("type", "=", facetType)
    .destroyAll(null, function(){
      _.each(facet, function(facetRow){
        review.facets.add(new M.Facet({
          review_id: review.rayyan_id,
          type: facetType,
          display: facetRow[0],
          value: facetRow[1] + '',  // could be integer
          count: facetRow[2]
        }))
      })
      persistence.flush(function(){
        M.getFacet(review, facetType, $q).then(function(facet){
          deferred.resolve(facet);
        })
      })
    })

  return deferred.promise;
}

M.removeFacets = function(facets, $q) {
  var deferred = $q.defer();
  facets.destroyAll(null, function(){
    deferred.resolve()
  })
  return deferred.promise;  
}

M.Facet = persistence.define('Facet', {
  review_id: "INT",
  type: "TEXT",
  value: "TEXT",
  display: "TEXT",
  count: "INT"
});

M.Review.hasMany('facets', M.Facet, 'review')

M.getFacet = function(review, facetType, $q) {
  var deferred = $q.defer()
  review.facets
    .filter("type", "=", facetType)
    .order(facetType == "inclusions" ? "value" : "count", false)
    .list(null, function(facet){
      deferred.resolve(facet);
    })
  return deferred.promise
}

M.setFacet = function(review, facetType, facet, $q) {
  var deferred = $q.defer();
  var appendFacets = function(facetType, collection, displayFunction) {
    _.each(collection, function(facetRow){
      review.facets.add(new M.Facet({
        review_id: review.rayyan_id,
        type: facetType,
        display: displayFunction ? displayFunction(facetRow[0]) : facetRow[0],
        value: facetRow[1],
        count: facetRow[2]
      }))
    })
  }

  switch(facetType) {
    case 'inclusions':
      review.facets
        .filter("type", "=", 'inclusions')
        .destroyAll(null, function(){
          // process inclusion counts
          var capitalize = function(str) {
            return str.charAt(0).toUpperCase() + str.substring(1).toLowerCase();
          }
          _.each(facet, function(count, key){
            review.facets.add(new M.Facet({
              review_id: review.rayyan_id,
              type: facetType,
              display: capitalize(key),
              value: key,
              count: count
            }))
          })
        })
    break;
    case 'labels': case 'reasons':
      review.facets
        .filter("type", "in", ['labels', 'reasons'])
        .destroyAll(null, function(){
          // process all_labels
          var partitions = _.partition(facet.collection, function(facetRow){
            return M.labelPredicate(facetRow[1])
          })
          appendFacets('labels', partitions[0])
          appendFacets('reasons', partitions[1], function(reason){
            return M.cleanExclusionReason(reason)
          })
        })
    break;
    case 'highlights':
      review.facets
        .filter("type", "like", 'highlights_%')
        .destroyAll(null, function(){
          _.each(facet, function(collection, key){
            appendFacets('highlights_' + key, collection)
          })
        })
    break;
    default:
      // process normal facet
      review.facets
        .filter("type", "=", facetType)
        .destroyAll(null, function(){
          appendFacets(facetType, facet.collection)
        })
  }
  persistence.flush(function(){
    M.getFacet(review, facetType, $q).then(function(facet){
      deferred.resolve(facet);
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

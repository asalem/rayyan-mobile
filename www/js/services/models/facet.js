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

// manually construct articles query and return article ids
M.getFilteredArticlesIds = function(review, offset, limit, facetValues, $q) {
  var deferred = $q.defer();

  var sql = squel
    .select()
    .from("article", "a")
    .where("a.review = ?", review.id)

  var expr = squel.expr()

  var buildTextSearchField = function(fieldList, qList) {
    // usinq sql level concatenation of % so that it is not replaced as %d, %c, ...
    if (!_.isEmpty(_.compact(qList))) {
      expr.and_begin()
      _.each(fieldList, function(field){
        _.each(qList, function(q){
          expr.or("a." + field + " like '%'||'" + q.replace(/'/g, "''") + "'||'%'")
        })
      })
      expr.end()
    }
  }

  persistence.transaction(function(tx){

    buildTextSearchField(["title", "full_abstract", "authors", "topics"], [facetValues.search])
    buildTextSearchField(["title"], [facetValues.titleSearch])
    buildTextSearchField(["full_abstract"], [facetValues.abstractSearch])
    buildTextSearchField(["authors"], [facetValues.authorSearch])
    buildTextSearchField(["title", "full_abstract", "topics"], facetValues.highlights_1)
    buildTextSearchField(["title", "full_abstract", "topics"], facetValues.highlights_2)
    buildTextSearchField(["topics"], facetValues.topics)
    
    var hasLabels = !_.isEmpty(facetValues.labels)
    var hasReasons = !_.isEmpty(facetValues.reasons)
    var hasInclusions = !_.isUndefined(facetValues.inclusions)

    if (hasLabels || hasReasons) {
      sql
        .join("customization", "c", "a.id = c.article")
        .distinct()
        .where("c.key in ?", (facetValues.labels||[]).concat(facetValues.reasons||[]))
        .where("c.value = 1")
    }

    if (hasInclusions) {
      // need an extra left join, because undecided may not have a row at all in customization table
      var value = parseInt(facetValues.inclusions)
      sql.left_join("customization", "ci", "a.id = ci.article and ci.key = 'included'")
      if (value != 0)
        sql.where("ci.value = ?", value)
      else
        sql.where(squel.expr().or("ci.value = 0").or("ci.key is null"))
    }

    var query = sql
      .where(expr)
      .clone()
      .field("a.id")
      .order("a.rayyan_id")
      .limit(limit)
      .offset(offset)
      .toString()

    tx.executeSql(query, [], function(results) {
      var ids = _.pluck(results, 'id')
      console.log(results, ids)
      // now get count
      var countQuery = sql
        .field("count(distinct a.id)", "count")
        .toString()

      tx.executeSql(countQuery, [], function(results) {
        ids.push(results[0].count)
        deferred.resolve(ids)
      });
    });
  })

  return deferred.promise;
}
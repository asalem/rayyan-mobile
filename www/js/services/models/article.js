M.Article = persistence.define('Article', {
  title: "TEXT",
  rayyan_id: "INT",
  citation: "TEXT",
  full_abstract: "TEXT",
  authors: "TEXT"
});

M.Review.hasMany('articles', M.Article, 'review')

M.getArticles = function(review, offset, limit, facetValues, $q) {
  console.log("in M.getArticles", review, offset, limit, facetValues)
  var deferred = $q.defer();

  // TODO move 2 functions out when converting to angular module
  var getFilteredArticlesIds = function(review, offset, limit, facetValues) {
    // manually construct query and return article ids
    var deferred = $q.defer();

    persistence.transaction(function(tx){
      var sql = "select id from Article "
        + "where review = '" + review.id + "' "

      // TODO sanitize search criteria or use a library to construct the query!
      // TODO persist topics, display them, and search in them
      // TODO do the rest of the where clauses
      if (facetValues.search) {
        sql += "and (article.title like '%"+facetValues.search+"%' "
          + "or article.full_abstract like '%"+facetValues.search+"%' "
          + "or article.authors like '%"+facetValues.search+"%') "
      }
      if (facetValues.titleSearch) {
        sql += "and (article.title like '%"+facetValues.titleSearch+"%') "
      }
      if (facetValues.authorSearch) {
        sql += "and (article.authors like '%"+facetValues.authorSearch+"%') "
      }
      if (facetValues.abstractSearch) {
        sql += "and (article.full_abstract like '%"+facetValues.abstractSearch+"%') "
      }

      sql += "order by rayyan_id asc "
        + "limit " + limit + " offset " + offset + ";"
      tx.executeSql(sql, [], function(results) {
        var ids = _.pluck(results, 'id')
        console.log(results, ids)
        deferred.resolve(ids)
      });
    })

    return deferred.promise;
  }

  var selectArticles = function(query) {
    query.list(null, function(articles){
      console.log("loaded articles from db", articles)
      M.assignCustomizations(review, articles, $q)
        .then(function(){
          deferred.resolve(articles);
        })
    })
  }

  var query

  if (!_.isEmpty(facetValues)) {
    query = M.Article.all().order("rayyan_id", true)
    getFilteredArticlesIds(review, offset, limit, facetValues)
      .then(function(articleIds){
        console.log("should continue query by the ids", articleIds)
        selectArticles(query.filter("id", "in", articleIds))
      })
  }
  else {
    query = review.articles
      .skip(offset)
      .limit(limit)
      .order("rayyan_id", true)

    selectArticles(query)
  }

  return deferred.promise
}

M.getArticle = function(articleId, $q) {
  var deferred = $q.defer()
  M.Article.all().filter("rayyan_id", "=", articleId).one(null, function(article){
    deferred.resolve(article);
  })
  return deferred.promise
}

M.setArticles = function(review, articlesAndCustomizations, offset, $q) {
  var deferred = $q.defer()
  var articles = articlesAndCustomizations.articles
  var customizations = M.groupCustomizationsByArticle(articlesAndCustomizations.customizations)

  _.each(articles, function(article){
    var a = new M.Article(article);
    _.each(customizations[article.rayyan_id], function(customization){
      var c = new M.Customization(customization)
      c.review = review
      a.customizations.add(c)
    })
    review.articles.add(a);
  })
  review.downloaded_articles = (review.downloaded_articles || 0) + articles.length;

  persistence.flush(function(){
    M.getArticles(review, offset, articles.length, null, $q).then(function(articles){
      deferred.resolve(articles);
    })
  });

  return deferred.promise
}

M.removeArticles = function(articles, $q) {
  var deferred = $q.defer();
  articles.destroyAll(null, function(){
    deferred.resolve()
  })
  return deferred.promise;
}

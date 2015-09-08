M.Article = persistence.define('Article', {
  title: "TEXT",
  rayyan_id: "INT",
  citation: "TEXT",
  full_abstract: "TEXT",
  authors: "TEXT",
  topics: "TEXT"
});

M.Review.hasMany('articles', M.Article, 'review')

M.getArticles = function(review, offset, limit, facetValues, $q) {
  console.log("in M.getArticles", review, offset, limit, facetValues)
  var deferred = $q.defer();
  var query;

  var selectArticles = function(query, count) {
    query.list(null, function(articles){
      console.log("loaded articles from db", articles)
      M.assignCustomizations(review, articles, $q)
        .then(function(){
          // push total count at the end
          articles.push(count)
          deferred.resolve(articles);
        })
    })
  }

  if (!_.isEmpty(facetValues)) {
    query = M.Article.all().order("rayyan_id", true)
    M.getFilteredArticlesIds(review, offset, limit, facetValues, $q)
      .then(function(articleIds){
        var count = articleIds.pop()
        selectArticles(query.filter("id", "in", articleIds), count)
      })
  }
  else {
    query = review.articles
      .skip(offset)
      .limit(limit)
      .order("rayyan_id", true)

    selectArticles(query, review.total_articles)
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

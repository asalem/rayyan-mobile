M.Article = persistence.define('Article', {
  title: "TEXT",
  rayyan_id: "INT",
  citation: "TEXT",
  full_abstract: "TEXT",
  authors: "TEXT"
});

M.Review.hasMany('articles', M.Article, 'review')

M.getArticles = function(review, offset, limit, $q) {
  console.log("in M.getArticles", review, offset, limit)
  var deferred = $q.defer();

  review.articles
    .skip(offset)
    .limit(limit)
    .order("rayyan_id", true)
    .list(null, function(articles){
      console.log("loaded articles from db", articles)
      M.assignCustomizations(review, articles, $q)
        .then(function(){
          deferred.resolve(articles);
        })
    })
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
    M.getArticles(review, offset, articles.length, $q).then(function(articles){
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

M.Article = persistence.define('Article', {
  title: "TEXT",
  rayyan_id: "INT",
  citation: "TEXT",
  full_abstract: "TEXT",
  authors: "TEXT"
});

M.Review.hasMany('articles', M.Article, 'reviews')
M.Article.hasMany('reviews', M.Review, 'articles')

M.getArticles = function(review, offset, limit, $q) {
  console.log("in M.getArticles", review, offset, limit)
  var deferred = $q.defer();

  // TODO may need to move customization processing to customization.js model
  review.articles
    .skip(offset)
    .limit(limit)
    .order("rayyan_id", true)
    .list(null, function(articles){
      console.log("loaded articles from db", articles)
      _.each(articles, function(article){
        article.included = null;
        article.labels = [];
        article.reasons = [];
        article.customizations.each(null, function(customization){
          console.log("loaded customization", customization)
          if (customization.key == 'included')
            article.included = customization.value > 0;
          else if (M.labelPredicate(customization.key))
            article.labels.push(customization.key)
          else
            article.reasons.push(M.cleanExclusionReason(customization.key))
        })
      })
      deferred.resolve(articles);
      // TODO: the deferred will be resolved after articles are fetched
      // but before customizations are fully merged
      // a possible fix is to make angular deeply watch the array
      // or add watchers for the 3 fields: include, labels and reasons
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
  var customizations = articlesAndCustomizations.customizations
  console.log("raw customizations", customizations)

  // prepare customizations
  var customizationsHash = _.reduce(customizations, function(hash, customization){
    if (!hash[customization.article_id]) hash[customization.article_id] = [];
    hash[customization.article_id].push(customization)
    return hash;
  }, {})
  console.log("processed customizations", customizationsHash)

  // TODO should insert or fetch existing article, not only insert
  // TODO should insert or update existing customization, not only insert
  _.each(articles, function(article){
    var a = new M.Article(article);
    _.each(customizationsHash[article.rayyan_id], function(customization){
      a.customizations.add(new M.Customization(customization))
    })
    review.articles.add(a);
  })

  // TODO merge customizations in table and returned articles
  // maybe server should return customization merged already in articles array

  persistence.flush(function(){
    M.getArticles(review, offset, articles.length, $q).then(function(articles){
      deferred.resolve(articles);
    })
  });

  return deferred.promise
}

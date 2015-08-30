M.Customization = persistence.define('Customization', {
  review_id: "INT",
  article_id: "INT",
  key: "TEXT",
  value: "INT"
});

M.Article.hasMany('customizations', M.Customization, 'article')
M.Review.hasMany('customizations', M.Customization, 'review')

M.labelPredicate = function(label) {
  return !label.match(/^__EXR__/)
}

M.cleanExclusionReason = function(reason) {
  return reason.replace(/^__EXR__/, '')
}

M.removeCustomizations = function(customizations, $q) {
  var deferred = $q.defer();
  customizations.destroyAll(null, function(){
    deferred.resolve()
  })
  return deferred.promise;
}

M.assignCustomizations = function(review, articles, $q) {
  // retrieve customizations from database and assign them to articles
  var deferred = $q.defer();

  // load
  review.customizations
    .filter("article_id", "in", _.pluck(articles, 'rayyan_id'))
    .list(null, function(customizations){
      // group
      var customizationsHash = M.groupCustomizationsByArticle(customizations)

      // assign
      _.each(articles, function(article){
        article.included = null;
        article.labels = [];
        article.reasons = [];
        _.each(customizationsHash[article.rayyan_id], function(customization){
          console.log("assigning customization", customization)
          if (customization.key == 'included')
            article.included = customization.value > 0;
          else if (customization.value > 0) {
            if (M.labelPredicate(customization.key))
              article.labels.push(customization.key)
            else
              article.reasons.push(M.cleanExclusionReason(customization.key))
          }
        })
      })
      deferred.resolve();
    })

  return deferred.promise;
}

M.groupCustomizationsByArticle = function(customizations) {
  // prepare customizations
  console.log("raw customizations", customizations)
  var customizationsHash = _.reduce(customizations, function(hash, customization){
    if (!hash[customization.article_id]) hash[customization.article_id] = [];
    hash[customization.article_id].push(customization)
    return hash;
  }, {})
  console.log("processed customizations", customizationsHash)
  return customizationsHash;
}

M.setCustomizations = function(review, article, plan, $q) {
  var deferred = $q.defer()
  var seenActions = {}
  // load existing customizations
  review.customizations
    .filter("article_id", "=", article.rayyan_id)
    .list(null, function(customizations){
      // for each existing customization, see if needs updating according to plan
      _.each(customizations, function(customization){
        if (plan[customization.key]) {
          customization.value = plan[customization.key]
          seenActions[customization.key] = true
        }
      })
      // for the unseen plan actions, insert as new customizations
      _.each(plan, function(value, key){
        console.log("checking seenActions for key", key)
        if (!seenActions[key]) {
          var c = new M.Customization({key: key, value: value, review_id: review.rayyan_id, article_id: article.rayyan_id})
          c.review = review
          article.customizations.add(c)
        }
      })

      // flush
      persistence.flush(function(){
        M.assignCustomizations(review, [article], $q)
          .then(function(){
            deferred.resolve();
          })
      })
    })

    return deferred.promise;
}
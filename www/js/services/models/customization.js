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
          else if (M.labelPredicate(customization.key))
            article.labels.push(customization.key)
          else
            article.reasons.push(M.cleanExclusionReason(customization.key))
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

// M.getReviews = function($q) {
//   var deferred = $q.defer()
//   M.Review.all().order("rayyan_id", true).list(null, function(reviews){
//     deferred.resolve(reviews);
//   })
//   return deferred.promise
// }

// M.getReview = function(reviewId, $q) {
//   var deferred = $q.defer()
//   M.Review.all().filter("rayyan_id", "=", reviewId).one(null, function(review){
//     deferred.resolve(review);
//   })
//   return deferred.promise
// }

// M.setReviews = function(reviews, $q) {
//   var deferred = $q.defer()
//   M.Review.all().destroyAll(null, function(){
//     _.each(reviews, function(review){
//       persistence.add(new M.Review(review))
//     })
//     persistence.flush(function(){
//       M.getReviews($q).then(function(reviews){
//         deferred.resolve(reviews);
//       })
//     });
//   })
//   return deferred.promise
// }

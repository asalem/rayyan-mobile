M.Review = persistence.define('Review', {
  rayyan_id: "INT",
  title: "TEXT",
  total_articles: "INT",
  downloaded_articles: "INT",
  included: "INT",
  excluded: "INT",
  articles_etag: "TEXT",
  blind: "BOOL",
  owner: "BOOL",
  users_count: "INT"
});

M.getReviews = function($q) {
  var deferred = $q.defer()
  M.Review.all().order("rayyan_id", false).list(null, function(reviews){
    deferred.resolve(reviews);
  })
  return deferred.promise
}

M.getReview = function(reviewId, $q) {
  var deferred = $q.defer()
  M.Review.all().filter("rayyan_id", "=", reviewId).one(null, function(review){
    deferred.resolve(review);
  })
  return deferred.promise
}

M.cleanReview = function(review, $q) {
  // cascade delete articles and customizations
  M.removeArticles(review.articles, $q)
  M.removeCustomizations(review.customizations, $q)
  review.downloaded_articles = 0
  review.download_pending = false
  review.download_error = null
}

M.setReviews = function(reviews, $q) {
  // insert new reviews or update existing ones or destroy deleted ones
  var deferred = $q.defer()

  // prepare newReviews
  var newReviews = _.reduce(reviews, function(hash, review){
    hash[review.rayyan_id] = review
    return hash;
  }, {})

  var fields = ["title", "total_articles", "blind", "users_count", "articles_etag", "included", "excluded"]
  M.getReviews($q).then(function(localReviews){
    _.each(localReviews, function(localReview){
      var newReview = newReviews[localReview.rayyan_id]
      if (newReview) {
        // found in newReviews, update then delete from newReviews
        _.each(_.pick(newReview, fields), function(value, key){
          if (key == 'articles_etag' && value != localReview[key] && localReview.downloaded_articles != 0) {
            console.log("found invalid review, now deleting its downloaded articles")
            M.cleanReview(localReview, $q);
          }
          localReview[key] = value
        })
        localReview.download_error = null
        delete newReviews[localReview.rayyan_id]
        // TODO: invalidate local review if customizations_etag has changed
      }
      else {
        // not found in newReviews, must have been deleted remotely, delete locally
        console.log("deleting local review cascading articles", localReview)
        M.cleanReview(localReview, $q)
        persistence.remove(localReview)
      }
    })
    // insert all remaining reviews in newReviews, those must have been created remotely
    _.each(newReviews, function(newReview){
      console.log("inserting remote review", newReview)
      persistence.add(new M.Review(newReview))
    })

    // ready to flush and retrieve the whole set of reviews
    persistence.flush(function(){
      M.getReviews($q).then(function(reviews){
        deferred.resolve(reviews);
      })
    })
  })

  return deferred.promise
}

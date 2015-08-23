M.Customization = persistence.define('Customization', {
  review_id: "INT",
  article_id: "INT",
  key: "TEXT",
  value: "INT"
});

M.Article.hasMany('customizations', M.Customization, 'article')

M.labelPredicate = function(label) {
  return !label.match(/^__EXR__/)
}

M.cleanExclusionReason = function(reason) {
  return reason.replace(/^__EXR__/, '')
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

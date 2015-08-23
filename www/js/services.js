angular.module('rayyan.services', ['rayyan.local.service', 'rayyan.remote.service'])

.factory('rayyanAPIService', function($http, rayyanLocalService, rayyanRemoteService, $localStorage, $q) {

  var getReviews = function() {
    var deferred = $q.defer()
    rayyanLocalService.getReviews()
      .then(function(reviews){
        deferred.notify(reviews); // return local reviews
        rayyanRemoteService.getReviews()  // fetch remote reviews
          .then(function(reviews){
            rayyanLocalService.setReviews(reviews) // save remote reviews locally
              .then(function(reviews){
                deferred.resolve(reviews);  // return remote reviews
              })
          }, function(error){
            deferred.reject(error);
          })
      })
    return deferred.promise;
  }

  var getArticles = function(review, offset, limit) {
    var deferred = $q.defer()
    rayyanLocalService.getArticles(review, offset, limit)
      .then(function(articles){
        if (articles.length == limit) {
          // done from local, return local articles
          deferred.resolve(articles)
        }
        else {
          // need a remote trip
          deferred.notify(articles); 
          var newOffset = offset + articles.length
          rayyanRemoteService.getArticles(review.rayyan_id, newOffset, limit - articles.length)  // fetch remote articles, TODO: optional
            .then(function(articles){
              rayyanLocalService.setArticles(review, articles, newOffset) // save remote articles locally
                .then(function(articles){
                  deferred.resolve(articles);  // return new articles
                })
            }, function(error){
              deferred.reject(error);
            })
        }
      })
    return deferred.promise;
  }

  return {
    login: function() {
      // if browser, cheat login
      (!window.cordova ? rayyanLocalService.login() : rayyanRemoteService.login())
      .then(function(){
        getReviews();
      })
    },
    logout: function() {
      rayyanRemoteService.logout()
      rayyanLocalService.logout()
    },
    loggedIn: rayyanLocalService.loggedIn,
    getDisplayName: rayyanLocalService.getDisplayName,
    getReviews: getReviews,
    getReview: rayyanLocalService.getReview,
    getLabels: rayyanRemoteService.getLabels, // TODO local/remote trick
    getArticles: getArticles,
    customizeArticle: function(reviewId, articleId, key, value) {

    },
    toggleBlind: rayyanRemoteService.toggleBlind
  }
})
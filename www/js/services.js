angular.module('rayyan.services', ['rayyan.local.service', 'rayyan.remote.service'])

.factory('rayyanAPIService', function($http, rayyanLocalService, rayyanRemoteService, $localStorage, $q, $timeout) {

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
          if (review.download_pending) {
            // should not do the remote trip in order not to conflict with the current pending download
            deferred.reject("download_pending")
          }
          else {
            // mark review as download pending, so that no other function can conflict with this
            review.download_pending = true;
            var newOffset = offset + articles.length
            rayyanRemoteService.getArticles(review.rayyan_id, newOffset, limit - articles.length)  // fetch remote articles, TODO: optional
              .then(function(articles){
                rayyanLocalService.setArticles(review, articles, newOffset) // save remote articles locally
                  .then(function(articles){
                    review.download_pending = false;
                    deferred.resolve(articles);  // return new articles
                  })
              }, function(error){
                review.download_pending = false;
                deferred.reject(error);
              })
          }
        }
      })
    return deferred.promise;
  }

  var cleanKey = function(facetType) {
    return facetType == 'inclusions' ? 'inclusions_clean' : null;
  }

  var getFacets = function(review, facetTypes) {
    var deferred = {}, promises = {}

    // partition facetTypes to clean and dirty sets
    var cleanAndDirtySets = _.partition(facetTypes, function(facetType){
      var key = cleanKey(facetType)
      return key && review[key]
    })

    var injectInclusions = function(promise) {
      promise.then(function(inclusions){
        return review.inclusions = inclusions
      })
    }

    // resolve clean set from local db
    _.each(cleanAndDirtySets[0], function(facetType){
      console.log("facet is clean, retrieving from local db for review", facetType, review.rayyan_id)
      promises[facetType] = rayyanLocalService.getFacet(review, facetType)
      if (facetType == 'inclusions')
        injectInclusions(promises[facetType])
    })

    // resolve dirty set from remote server
    var dirtyFacetTypes = cleanAndDirtySets[1]
    if (dirtyFacetTypes.length > 0) {
      console.log("facets are dirty, retrieving from remote server for review", dirtyFacetTypes, review.rayyan_id)
      // prepare promises for remote callbacks for each facetType
      _.each(dirtyFacetTypes, function(facetType){
        deferred[facetType] = $q.defer()
        promises[facetType] = deferred[facetType].promise
        if (facetType == 'inclusions')
          injectInclusions(promises[facetType])
      })
      rayyanRemoteService.getFacets(review.rayyan_id, dirtyFacetTypes)
        .then(function(facets){
          // remote request succeeded
          console.log("facets retrieved from remote server for review", dirtyFacetTypes, review.rayyan_id, facets)
          _.each(facets, function(facet, facetType){
            rayyanLocalService.setFacet(review, facetType, facet)
              .then(function(facet){
                console.log("facet saved to local db for review", facetType, review.rayyan_id)
                var key = cleanKey(facetType)
                if (key) review[key] = true;
                deferred[facetType].resolve(facet)
              }, function(error){
                deferred[facetType].reject(error)
              })
          })
        }, function(){
          // although dirty but remote request failed, last resort is to get from local db
          _.each(dirtyFacetTypes, function(facetType){
            rayyanLocalService.getFacet(review, facetType)
              .then(function(facet){
                deferred[facetType].resolve(facet)
              }, function(error){
                deferred[facetType].reject(error)
              })
          })
        })
    }

    return $q.all(promises)
  }

  var getLabels = function(reviewId) {
    // TODO replace by getFacets
    return rayyanRemoteService.getLabels(reviewId)
      .then(function(labels){
        return labels;
      }, function(){
        // on error, return empty array
        // TODO: return local labels
        return [];
      })
  }

  var downloadReviewArticles = function(review) {
    if (review.download_pending) return;
    review.download_pending = true;
    review.download_error = false;
    var limit = 20;
    var deferred = $q.defer();

    var downloadBatch = function() {
      var offset = review.downloaded_articles
      rayyanRemoteService.getArticles(review.rayyan_id, offset, limit)  // fetch remote articles
        .then(function(articles){
          // if articles_etag changed while downloading? reject download
          if (articles.articles_etag != review.articles_etag) {
            review.download_pending = false;
            review.download_error = true;
            deferred.reject("articles_etag_changed");
          }
          else {
            rayyanLocalService.setArticles(review, articles, offset) // save remote articles locally
              .then(function(articles){
                if (articles.length < limit || !review.download_pending) {
                  review.download_pending = false;
                  deferred.resolve(); // finished downloading all articles, or download cancelled by another function
                }
                else
                  downloadBatch(); // download next batch
              })
          }
        }, function(error){
          review.download_pending = false;
          review.download_error = true;
          deferred.reject("server_error");
        })
    }

    downloadBatch();
    return deferred.promise;
  }

  var cancelDownloadReviewArticles = function(review) {
    if (!review.download_pending) return;
    review.download_pending = false;
  }

  var clearReviewArticles = function(review) {
    M.cleanReview(review, $q)
  }

  var applyCustomization = function(review, article, plan) {
    // plan is an object: {key1: value1, ...}
    var deferred = $q.defer();

    if (_.isEmpty(plan))
      deferred.reject(0);
    else {
      // stack journal and remote promises together
      var promises = [deferred.promise], journalAction = null

      // save locally
      rayyanLocalService.applyCustomization(review, article, plan)

      // save to journal
      promises.push(rayyanLocalService.addActionToJournal(review, article, plan)
        .then(function(_journalAction){
          journalAction = _journalAction
          deferred.notify(1)  // 1 action added to journal
          console.log("notified by 1 journal action")
        }))

      // try the remote request
      rayyanRemoteService.applyCustomization(review.rayyan_id, article.rayyan_id, plan)
        .then(function(){
          // success
          deferred.resolve(0)  // end result is nothing added to journal
          console.log("resolved by 0 journal action due to success")
        }, function(response){
          console.log("failed to applyCustomization, response status is", response.status)
          if (response.status != 403 && response.status != 404) {
            // temporarily failure (no Internet or Rayyan server down)
            deferred.reject(1)   // end result is 1 action added to journal
            console.log("rejected by 1 journal action due to temporary error")
          }
          else {
            // permanent failure (403, 404), remove from journal
            deferred.reject(0)  // end result is nothing added to journal
            console.log("rejected by 0 journal action due to permanent error")
          }
        })

      // when both promises are done, delete journal action on success
      console.log("promises are", promises)
      $q.all(promises)
        .then(function(){
          // success, delete journal action
          console.log("in $q.all success")
          rayyanLocalService.removeJournalAction(journalAction)
        }, function(journalActionCount){
          // error, if permananet error, remove journal action, otherwise leave it
          console.log("in $q.all failure, count:", journalActionCount)
          if (journalActionCount == -1)
            rayyanLocalService.removeJournalAction(journalAction)
        })
    }
    return deferred.promise;
  }

  var processJournalPlans = function() {
    var deferred = $q.defer()
    var batchSize = 20

    var reduceActionsToRequestsHash = function(actions) {
      console.log("reducing journal actions", actions)
      return _.reduce(actions, function(hash, action){
        if (!hash[action.review_id]) hash[action.review_id] = {};
        if (!hash[action.review_id][action.article_id])
          hash[action.review_id][action.article_id] = {plan: action.plan, ids: [action.id]};
        else {
          _.extend(hash[action.review_id][action.article_id].plan, action.plan)
          hash[action.review_id][action.article_id].ids.push(action.id)
        }
        return hash;
      }, {})
    }

    var processAllRequests = function(requestsHash) {
      console.log("processing requestsHash", requestsHash)
      var promises = []
      _.each(requestsHash, function(articles, review_id){
        _.each(articles, function(journal, article_id){
          var requestDeferred = $q.defer()
          promises.push(requestDeferred.promise)
          rayyanRemoteService.applyCustomization(review_id, article_id, journal.plan)
            .then(function(){
              console.log("journal action succeeded") 
              rayyanLocalService.removeJournalActions(journal.ids)
              requestDeferred.resolve()
            }, function(response){
              console.log("journal action failed", response.status)
              if (response.status == 403 || response.status == 404) {
                rayyanLocalService.removeJournalActions(journal.ids)
                requestDeferred.resolve()
              }
              else
                requestDeferred.reject()
            })
        })
      })
      // return when all promises are done, any reject will make this combined rejected
      return $q.all(promises)
    }

    var processBatch = function() {
      rayyanLocalService.getJournalPendingActionsCount()
        .then(function(count){
          deferred.notify(count)
          rayyanLocalService.getJournalPendingActionsBatch(batchSize)
            .then(function(actions){
              if (actions.length == 0)
                deferred.resolve()
              else {
                processAllRequests(reduceActionsToRequestsHash(actions))
                  .then(
                    processBatch,
                    function(){
                      // any failure
                      console.log("some journal requests failed")
                      rayyanLocalService.getJournalPendingActionsCount()
                        .then(function(count){
                          deferred.notify(count)
                          deferred.resolve()
                        })
                    }
                  )
              }
            })
        })
    }

    processBatch();

    return deferred.promise;
  }

  return {
    login: function(demo) {
      // if browser, cheat login
      return (!window.cordova ? rayyanLocalService.login() : rayyanRemoteService.login(demo));
    },
    logout: function() {
      rayyanRemoteService.logout()
      rayyanLocalService.logout()
    },
    loggedIn: rayyanLocalService.loggedIn,
    getDisplayName: rayyanLocalService.getDisplayName,
    getReviews: getReviews,
    getReview: rayyanLocalService.getReview,
    getLabels: getLabels,
    getArticles: getArticles,
    getFacets: getFacets,
    toggleBlind: rayyanRemoteService.toggleBlind,
    downloadReviewArticles: downloadReviewArticles,
    cancelDownloadReviewArticles: cancelDownloadReviewArticles,
    clearReviewArticles: clearReviewArticles,
    applyCustomization: applyCustomization,
    processJournalPlans: processJournalPlans,
    getJournalPendingActionsCount: rayyanLocalService.getJournalPendingActionsCount
  }
})
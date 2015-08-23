angular.module('rayyan.local.service', ['rayyan.remote.service'])

.factory('rayyanLocalService', function($localStorage, rayyanRemoteService, $ionicPlatform, $q) {

  var initialized = false;

  // init persistence and optionally run migrations
  var initDatabase = function() {
    persistence.store.cordovasql.config(
      persistence,
      'rayyan-mobile',
      '0.0.1',                // DB version
      'Rayyan Mobile',        // DB display name
      1000 * 1024 * 1024,     // DB size (needed in WebSQL only)
      1,                      // SQLitePlugin Background processing disabled
      2                       // DB location (iOS only), 0 (default): Documents, 1: Library, 2: Library/LocalDatabase
                              //   0: iTunes + iCloud, 1: NO iTunes + iCloud, 2: NO iTunes + NO iCloud
    );
  }

  var defineMigrations = function() {
    var deferred = $q.defer()
    // M = {}
    // TODO load all migrations/models through requirejs([], callback)
    deferred.resolve();  
    return deferred.promise;
  }

  var runMigrations = function() {
    var deferred = $q.defer()
    persistence.migrations.init(function() {
      persistence.migrate(function(){
        deferred.resolve();
      });
    });
    return deferred.promise;
  }

  var rollbackAllMigrations = function(callback) {
    persistence.migrate(0, _.isFunction(callback) ? callback : function(){})
  }

  var getReady = function() {
    var deferred = $q.defer()
    if (initialized)
      deferred.resolve()
    else {
      $ionicPlatform.ready(function() {
        initDatabase();
        defineMigrations()
          .then(function(){
            runMigrations()
              .then(function(){
                initialized = true;
                deferred.resolve()
              })
          })
      })
    }
    return deferred.promise;
  }

  return {
    login: function() {
      // testing on browser, cheat accessToken
      rayyanRemoteService.setAccessToken("c10646fe6391ae5534bf5381a6ba06828b20c34c6c71dd3cd23d586a1a01bbd0");
      return rayyanRemoteService.getUserInfo();
    },
    logout: function() {
      $localStorage.$reset();
      // destroy all data by rolling back to the start then migrating to the end
      getReady().then(function(){
        rollbackAllMigrations(function(){
          initialized = false
        });
      })
    },
    loggedIn: function() {
      return $localStorage.accessToken != null
    },
    getDisplayName: function() {
      return $localStorage.displayName;
    },
    getReviews: function() {
      return getReady().then(function(){
        return M.getReviews($q)
      })
    },
    setReviews: function(reviews) {
      return getReady().then(function(){
        return M.setReviews(reviews, $q)
      })
    },
    getReview: function(reviewId) {
      return getReady().then(function(){
        return M.getReview(reviewId, $q)
      })
    },
    getArticles: function(review, offset, limit) {
      return getReady().then(function(){
        console.log("in local.service getArticles", review.title, offset, limit)
        return M.getArticles(review, offset, limit, $q)
      })
    },
    setArticles: function(review, articles, offset) {
      return getReady().then(function(){
        return M.setArticles(review, articles, offset, $q)
      })
    }
  }
})
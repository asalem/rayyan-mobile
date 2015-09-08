angular.module('rayyan.local.service', ['rayyan.remote.service'])

.factory('rayyanLocalService', function($localStorage, rayyanRemoteService, $ionicPlatform, $q) {

  var initialized = false, initializing = false;

  // init persistence and optionally run migrations
  var initDatabase = function() {
    console.log("db: initializing database")
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
    console.log("db: definig migrations")
    var deferred = $q.defer()
    // M = {}
    // TODO load all migrations/models through requirejs([], callback)
    deferred.resolve();  
    return deferred.promise;
  }

  var runMigrations = function() {
    console.log("db: running migrations")
    var deferred = $q.defer()
    persistence.migrations.init(function() {
      persistence.migrate(function(){
        console.log("db: migrations done")
        deferred.resolve();
      });
    });
    return deferred.promise;
  }

  var rollbackAllMigrations = function(callback) {
    persistence.migrate(0, _.isFunction(callback) ? callback : function(){})
  }

  var init = function() {
    var deferred = $q.defer()
    if (initialized)
      deferred.resolve()
    else if (initializing)
      deferred.reject("rayyan_db_initialize_pending")
    else {
      initializing = true;
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

  var getReady = function() {
    console.log("in getReady, caller", arguments.callee.caller.toString())
    var deferred = $q.defer()
    if (initialized)
      deferred.resolve()
    else
      deferred.reject("rayyan_db_not_initialized")
    return deferred.promise;
  }

  var injectExcludeInPlan = function(plan) {
    // if any key in the plan is an exclusion reason, then auto-exclude article
    if (_.some(plan, function(value, key){return key != 'included' && value > 0 && !M.labelPredicate(key)}))
      return _.defaults(_.clone(plan), {included: -1});
    else
      return plan;
  }

  return {
    init: init, // must call prior to any other call below (except login which is fake anyway)
    login: function() {
      // testing on browser, cheat accessToken
      rayyanRemoteService.setAccessToken(
        "ab68db31414734cac6e4d9c10e804b5a76538a58fbb87a6955a4800632a63970",   // access_token
        "021a467e5f88fb01b2814e9289d26dc966ebc041442d0a2442d10e77b0838c96");  // refresh_token
      rayyanRemoteService.setBaseURI(false)
      return rayyanRemoteService.getUserInfo();
    },
    logout: function() {
      $localStorage.$reset();
      return getReady().then(function(){
        // cascade destroying all reviews/articles/customizations
        return M.setReviews([], $q)
        // TODO erase journal?
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
    getArticles: function(review, offset, limit, facetValues) {
      return getReady().then(function(){
        return M.getArticles(review, offset, limit, facetValues, $q)
      })
    },
    setArticles: function(review, articles, offset) {
      return getReady().then(function(){
        return M.setArticles(review, articles, offset, $q)
      })
    },
    getFacet: function(review, facetType) {
      return getReady().then(function(){
        return M.getFacet(review, facetType, $q)
      })
    },
    setFacet: function(review, facetType, facets) {
      return getReady().then(function(){
        return M.setFacet(review, facetType, facets, $q)
      })
    },
    applyCustomization: function(review, article, plan) {
      return getReady().then(function(){
        return M.setCustomizations(review, article, injectExcludeInPlan(plan), $q)
      })
    },
    addActionToJournal: function(review, article, plan) {
      return getReady().then(function(){
        return M.appendJournalPlan(review, article, injectExcludeInPlan(plan), $q);
      })
    },
    getJournalPendingActionsCount: function() {
      return getReady().then(function(){
        return M.getJournalPendingActionsCount($q)
      })
    },
    getJournalPendingActionsBatch: function(batchSize) {
      return getReady().then(function(){
        return M.getJournalPendingActionsBatch(batchSize, $q)
      })
    },
    removeJournalActions: function(ids) {
      return getReady().then(function(){
        return M.removeJournalActions(ids, $q)
      })
    },
    removeJournalAction: function(journalAction) {
      return getReady().then(function(){
        return M.removeJournalAction(journalAction, $q)
      })
    },
    setBlind: function(review, blind)  {
      return getReady().then(function(){
        return M.setBlindReview(review, blind, $q)
      })
    }
  }
})
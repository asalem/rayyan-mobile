angular.module('rayyan.remote.service', [])

.constant('DEMO_BASE_URI', 'http://rayyan.qcridemos.org')
.constant('PRODUCTION_BASE_URI', 'http://127.0.0.1:5000')
// .constant('PRODUCTION_BASE_URI', 'http://rayyan.qcri.org')
// TODO in production, enable real production url

.factory('rayyanRemoteService', function($http, $localStorage, $ionicPlatform, $q,
  DEMO_BASE_URI, PRODUCTION_BASE_URI) {

  var clientId = "b174200899509ee7a4d90d7457c6ea63bbb8a79ed1059753adc100bd0b685d63"
  var clientSecret = "e1f17b03e0e36446917e50598544cff58dff03ea48dd1d5ee364fdb7d9f6f19a"
  var redirectURI = "http://localhost/callback"
  var baseURI = $localStorage.baseURI,
      accessToken = $localStorage.accessToken
  $http.defaults.headers.common['Content-Type'] = 'application/json';

  var objectToQueryString = function(object, keyPrefix) {
    if (!object) return "";
    console.log("payload object", object)
    var arr = []
    // fix _ bug where an existing length property will confuse the each
    var length = null
    if (_.has(object, "length")) {
      length = object.length
      delete object.length
    }
    _.each(object, function(value, key){
      var argument
      if (_.isFunction(value))
        ;// not supported
      else if (_.isObject(value))
        argument = objectToQueryString(value, keyPrefix ? keyPrefix + key : key)
      else {
        if (keyPrefix)
          argument = encodeURIComponent(keyPrefix + "[" + key + "]")
        else
          argument = encodeURIComponent(key)
        argument += '=' + encodeURIComponent(value);
      }

      arr.push(argument)
    })
    if (!_.isNull(length)) {
      arr.push('length=' + length)
      object.length = length
    }
    console.log("payload arr", arr)
    return arr.join("&")
  }

  var reportError = function(method, endpoint, data, response) {
    // TODO central handling for errors
    console.log("ERROR IN REQUEST", method, endpoint, data, response)
  }

  var request = function(method, endpoint, data, noRefreshToken) {
    var deferred = $q.defer();
    var req = {
      method: method,
      url: baseURI + endpoint,
      headers: {
        "Authorization": "Bearer " + accessToken
      }
    }

    if (data) {
      switch (method.toUpperCase()) {
        case 'GET':
          req.url += "?" + objectToQueryString(data);
        break;
        default:
          req.data = data
      }
    }

    $http(req).then(function(response) {
      deferred.resolve(response.data)
      // TODO: count received bytes here (take care of gzipping, read Content-Length)
    }, function(response) {
      console.log("error in http with status", response.status)
      if (!noRefreshToken && response.status == 401) {
        console.log("Got 401, accessToken [1] must have been expired, trying to refresh using [2], full response [3]",
          accessToken, $localStorage.refreshToken, JSON.stringify(response))
        continueAuth($localStorage.refreshToken, true)
          .then(function(){
            console.log("Succeeded in refreshing token and got new token [1] with refresh token [2]",
              accessToken, $localStorage.refreshToken)
            request(method, endpoint, data)
              .then(function(responseData){
                deferred.resolve(responseData)
              }, function(response){
                // main request failed even after refreshing token, report error
                deferred.reject(response)
                reportError(method, endpoint, data, response)
              })
          }, function(response){
            // failed to refresh accessToken, may be user revoked client, must re-login
            // TODO: sometimes if 2 requests are done in parallel, both will give 401, one will refresh and succeed
            // the other will refresh (the now outdated token) and fail, cause login screen to appear
            console.log("Got 401 again, could not refresh token, user may have revoked access, must re-login, here is response", 
              JSON.stringify(response))
            deferred.reject(response)
            reportError(method, endpoint, data, response)
            startAuth(); // relogin
          })
      }
      else {
        // main request failed (not 401)
        deferred.reject(response)
        reportError(method, endpoint, data, response)
      }
    })
    return deferred.promise;
  }

  var requestReviewEndpoint = function(method, endpoint, reviewId, data) {
    return request(method, endpoint.replace(":id", reviewId), data)
  }

  var setAccessToken = function(_accessToken, refreshToken) {
    accessToken = _accessToken
    $localStorage.accessToken = _accessToken
    $localStorage.refreshToken = refreshToken
  }

  var setBaseURI = function(demo) {
    baseURI = demo ? DEMO_BASE_URI : PRODUCTION_BASE_URI
    $localStorage.baseURI = baseURI;
  }

  var login = function(demo) {
    setBaseURI(demo);
    return startAuth();
  }

  var startAuth = function() {
    var deferred = $q.defer()
    // https://blog.nraboy.com/2014/07/using-oauth-2-0-service-ionicframework/
    $ionicPlatform.ready(function() {
      var authorizeURI = baseURI + "/oauth/authorize?client_id="+clientId+"&redirect_uri="+redirectURI+"&response_type=code"
      var ref = (window.cordova ? cordova.InAppBrowser : window).open(authorizeURI, '_blank', 'location=yes,clearsessioncache=yes,clearcache=yes');
      ref.addEventListener('loadstart', function(event) {
        if((event.url).indexOf(redirectURI) == 0) {
          ref.close();
          var code = (event.url).split("code=")[1];
          continueAuth(code).then(function(){
            getUserInfo()
              .finally(function(){
                deferred.resolve()
              })
          }, function(){
            deferred.reject()
          })
        }
      });
    })
    return deferred.promise;
  }

  var continueAuth = function(code, refresh) {
    var data = {
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectURI,
      grant_type: 'authorization_code',
      code: code 
    }
    if (refresh) {
      data.grant_type = "refresh_token";
      data.refresh_token = code;
    }
    return request('POST', '/oauth/token', data, true)
      .then(function(data) {
        // data = {"access_token":"...","token_type":"bearer","expires_in":7200,"refresh_token":"...","created_at":1440919170}
        setAccessToken(data.access_token, data.refresh_token)
      })
  }

  var revoke = function() {
    return request('POST', '/oauth/revoke', {token: accessToken})
  }

  var getUserInfo = function() {
    return request('GET', '/api/v1/user_info')
      .then(function(data){
        console.log("got data from getUserInfo", data)
        $localStorage.displayName = data.displayName
        $localStorage.userId = data.userId
      }, function(data) {
        $localStorage.displayName = "Unknown"
        $localStorage.userId = 0
      })
  }

  var getReviews = function() {
    return request('GET', '/api/v1/reviews')
      .then(function(data){
        console.log("got data from getReviews", data)
        var reviews = _.map(data.owned_reviews, function(review){
          return _.extend(review, {owner: true})
        }).concat(_.map(data.collab_reviews, function(review) {
          return _.extend(review, {owner: false})
        }))
        console.log("refreshed reviews: ", reviews.length)        
        return reviews
      })
  }

  var transformRemoteFacets = function(facet, facetType) {
    // override irrelevant rayyan_ids with searchable values (display)
    var overrideValues = function(collection, overrider) {
      return _.map(collection, function(facetRow){
        var copy = _.clone(facetRow)
        copy[1] = _.isFunction(overrider) ? overrider(copy) : copy[0]
        return copy
      })
    }

    var hash = {}
    var inclusionsMap = {included: 1, excluded: -1, undecided: 0}
    switch(facetType) {
      case 'inclusions':
        hash.inclusions = _.map(facet, function(count, key){
          return [
            M.capitalize(key),
            inclusionsMap[key],
            count
          ]
        })
      break;
      case 'all_labels':
        var partitions = _.partition(facet.collection, function(facetRow){
          return M.labelPredicate(facetRow[1])
        })
        hash.labels = partitions[0]
        hash.reasons = partitions[1]
        _.each(hash.reasons, function(facetRow){
          facetRow[0] = M.cleanExclusionReason(facetRow[[0]])
        })
      break;
      case 'keyphrases':
        hash.topics = overrideValues(facet.collection)
      break;
      case 'highlights':
        _.each(facet, function(collection, key){
          hash['highlights_' + key] = overrideValues(collection)
        })
      break;
      default:
        hash[facetType] = facet.collection
    }
    return hash
  }

  var getFacets = function(reviewId, facetTypes) {
    var promises = {}
    var paramsMap = {
      labels: 'user_labels',
      reasons: 'exclusion_labels',
      topics: 'keyphrases',
      highlights_1: 'highlights',
      highlights_2: 'highlights'
    }

    // send inclusion counts request if found in facetTypes
    if (_.contains(facetTypes, 'inclusions')) {
      facetTypes = _.without(facetTypes, 'inclusions')
      promises.inclusions = requestReviewEndpoint(
        'GET', '/api/v1/reviews/:id/inclusion_counts', reviewId, {force_blind: 1})
    }

    // send all other facetTypes in a single facets request
    if (facetTypes.length > 0) {
      var params = _.reduce(facetTypes, function(hash, facetType){
        hash[paramsMap[facetType]] = 1
        return hash
      }, {})

      promises.remote = requestReviewEndpoint('GET', '/api/v1/reviews/:id/facets', reviewId, {facets: params})
    }

    return $q.all(promises)
      .then(function(promises){
        // transform returned facets from server compressed objects to client releaxed ones
        return _.reduce(promises.remote, function(hash, facet, facetType){
          return _.extend(hash, transformRemoteFacets(facet, facetType))
        }, promises.inclusions 
          ? _.extend({}, transformRemoteFacets(promises.inclusions, 'inclusions'))
          : {})
      })
  }

  var getLabels = function(reviewId) {
    return requestReviewEndpoint('GET', '/api/v1/reviews/:id/labels', reviewId);
  }

  var getArticles = function(reviewId, offset, limit) {
    return requestReviewEndpoint('GET', '/api/v1/reviews/:id/articles', reviewId, {
      start: offset,
      length: limit
    });
  }

  var toggleBlind = function(reviewId) {
    return requestReviewEndpoint('POST', '/api/v1/reviews/:id/blind', reviewId)
      .then(function(data){
        return data.is_blind
      })
  }

  var applyCustomization = function(reviewId, articleId, plan) {
    // plan is an object: {review_id: r, article_id: a, plan: [{key: k1, value: v1}, ...]}
    return requestReviewEndpoint('POST', '/api/v1/reviews/:id/customize', reviewId, {article_id: articleId, plan: plan})
  }

  return {
    setAccessToken: setAccessToken,
    setBaseURI: setBaseURI,
    login: login,
    logout: revoke,
    getUserInfo: getUserInfo,
    getReviews: getReviews,
    getFacets: getFacets,
    getLabels: getLabels,
    getArticles: getArticles,
    toggleBlind: toggleBlind,
    applyCustomization: applyCustomization
  }
})
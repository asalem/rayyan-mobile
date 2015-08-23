angular.module('rayyan.remote.service', [])

.factory('rayyanRemoteService', function($http, $localStorage, $q) {

  var clientId = "b174200899509ee7a4d90d7457c6ea63bbb8a79ed1059753adc100bd0b685d63"
  var clientSecret = "e1f17b03e0e36446917e50598544cff58dff03ea48dd1d5ee364fdb7d9f6f19a"
  var redirectURI = "http://localhost/callback"
  var baseURI = "http://127.0.0.1:5000"
  // var baseURI = "http://10.153.18.24:5000"
  // var baseURI = "http://192.168.100.14:5000"
  var postURI = baseURI + "/oauth/authorize"
  var authorizeURI = postURI + "?client_id="+clientId+"&redirect_uri="+redirectURI+"&response_type=code"
  var accessToken = $localStorage.accessToken
  var resultsLimit = 5
  $http.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';
  $http.defaults.headers.get = {'Content-Type': 'application/x-www-form-urlencoded'};

  var objectToQueryString = function(object) {
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
      arr.push(encodeURIComponent(key) + '=' + encodeURIComponent(value))
    })
    if (!_.isNull(length))
      arr.push('length=' + length)
    console.log("payload arr", arr)
    return arr.join("&")
  }


  var request = function(method, endpoint, data) {
    var deferred = $q.defer();
    var req = {
      method: method,
      url: baseURI + endpoint + "?access_token=" + accessToken
    }
    var payload = objectToQueryString(data)
    switch (method.toUpperCase()) {
      case 'GET':
        req.url += "&" + payload
      break;
      default:
        req.data = payload
    }
    $http(req).then(function(response) {
      deferred.resolve(response.data)
    }, function(response) {
      var msg = "Error calling endpoint: " + endpoint + "\n" + response
      deferred.reject(msg)
      console.log("ERROR IN REQUEST", method, endpoint, data, msg)
      // TODO central handling for errors
    })
    return deferred.promise;
  }

  var requestReviewEndpoint = function(method, endpoint, reviewId, data) {
    var deferred = $q.defer()
    request(method, endpoint.replace(":id", reviewId), data)
      .then(function(data){
        deferred.resolve(data)
      }, function(error){
        deferred.reject(error)
      })
    return deferred.promise
  }

  var setAccessToken = function(_accessToken) {
    accessToken = _accessToken
    $localStorage.accessToken = _accessToken
  }

  var startAuth = function() {
    // https://blog.nraboy.com/2014/07/using-oauth-2-0-service-ionicframework/
    var ref = window.open(authorizeURI, '_blank', 'location=no,clearsessioncache=yes,clearcache=yes');
    ref.addEventListener('loadstart', function(event) {
      if((event.url).indexOf(redirectURI) == 0) {
        ref.close();
        var code = (event.url).split("code=")[1];
        return continueAuth(code).then(function(){
          getUserInfo()
        })
      }
    });
  }

  var continueAuth = function(code) {
    return request('POST', '/oauth/token', {
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectURI,
      grant_type: 'authorization_code',
      code: code 
    })
    .then(function(data) {
      setAccessToken(data.access_token)
    })
  }

  var getUserInfo = function() {
    return request('GET', '/api/v1/user_info')
      .then(function(data){
        console.log("got data from getUserInfo", data)
        $localStorage.displayName = data.displayName
      }, function(data) {
        $localStorage.displayName = "Unknown"
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

  return {
    setAccessToken: setAccessToken,
    login: startAuth,
    logout: function() {
      // TODO revoke token
    },
    getUserInfo: getUserInfo,
    getReviews: getReviews,
    getLabels: getLabels,
    getArticles: getArticles,
    customizeArticle: function(reviewId, articleId, key, value) {

    },
    toggleBlind: toggleBlind
  }
})
angular.module('rayyan.services', [])

.factory('rayyanAPIService', function($http, $localStorage, $q) {

  var clientId = "b174200899509ee7a4d90d7457c6ea63bbb8a79ed1059753adc100bd0b685d63"
  var clientSecret = "e1f17b03e0e36446917e50598544cff58dff03ea48dd1d5ee364fdb7d9f6f19a"
  var redirectURI = "http://localhost/callback"
  var baseURI = "http://127.0.0.1:5000"
  // var baseURI = "http://10.153.18.13:5000"
  // var baseURI = "http://192.168.100.10:5000"
  var postURI = baseURI + "/oauth/authorize"
  var authorizeURI = postURI + "?client_id="+clientId+"&redirect_uri="+redirectURI+"&response_type=code"
  var accessToken = $localStorage.accessToken
  $http.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';
  $http.defaults.headers.get = {'Content-Type': 'application/x-www-form-urlencoded'};

  var fakeArticles = [
    {
      id: 1, title: "Test article 1", date: "2014-10-01", abstract: "1) This is the abstract and it should be long enough... This is the abstract and it should be long enough... This is the abstract and it should be long enough... This is the abstract and it should be long enough... This is the abstract and it should be long enough... This is the abstract and it should be long enough... This is the abstract and it should be long enough... This is the abstract and it should be long enough... This is the abstract and it should be long enough... This is the abstract and it should be long enough... This is the abstract and it should be long enough... ",
      authors: "1.Author1, Author2, Author3",
      labels: ['aaa', 'bbb', 'a really long label to fit in the menu, lets see how it will be displayed'],
      reasons: ['reason 1a', 'reason 1b', 'reason 1c', 'reason d', 'reason e', 'reason f', 'reason g'],
      included: {'hossam': true, 'mourad': false}
    },
    {
      id: 2, title: "Test article 2", date: "2014-11-01", abstract: "2) This is the abstract and it should be long enough... This is the abstract and it should be long enough... This is the abstract and it should be long enough... This is the abstract and it should be long enough... This is the abstract and it should be long enough... This is the abstract and it should be long enough... This is the abstract and it should be long enough... This is the abstract and it should be long enough... This is the abstract and it should be long enough... This is the abstract and it should be long enough... This is the abstract and it should be long enough... This is the abstract and it should be long enough... This is the abstract and it should be long enough...",
      authors: "2.Author1, Author2, Author3",
      labels: ['label 2a', 'label 2b'],
      included: {'hossam': false, 'mourad': true}
    },
    {
      id: 3, title: "Test article 3", date: "2015-03-01", abstract: "3) This is the abstract and it should be long enough...",
      authors: "3.Author1, Author2, Author3",
      reasons: ['reason 3a', 'reason 3b', 'reason 3c']
    }
  ]
  var lastArticle = -1;

  var objectToQueryString = function(object) {
    if (!object) return ""
    var arr = []
    _.each(object, function(value, key){
      arr.push(encodeURIComponent(key) + '=' + encodeURIComponent(value))
    })
    return arr.join("&")
  }


  var request = function(method, endpoint, data) {
    var deferred = $q.defer();
    $http({
      method: method,
      url: baseURI + endpoint + "?access_token=" + accessToken,
      data: objectToQueryString(data)
    })
    .then(function(data) {
      deferred.resolve(data.data)
      // return data;  // for chaining
    }, function(data) {
      var msg = "Error calling endpoint: " + endpoint + "\n" + data
      deferred.reject(msg)
      alert(msg)
      // return msg; // for chaining
      // TODO central handling for errors
    })
    return deferred.promise;
  }

  var requestReviewEndpoint = function(method, endpoint, reviewId, data) {
    var deferred = $q.defer()
    var review = _.find($localStorage.reviews, function(r){return r.id == reviewId})
    if (!review)
      deferred.reject("Unknown review")
    else {
      request(method, endpoint, data)
        .then(function(data){
          console.log("in requestReviewEndpoint, data", data)
          deferred.resolve({review: review, data: data})
        }, function(error){
          deferred.reject(error)
        })
    }
    return deferred.promise
  }

  var startAuth = function() {
    // https://blog.nraboy.com/2014/07/using-oauth-2-0-service-ionicframework/
    var ref = window.open(authorizeURI, '_blank', 'location=no,clearsessioncache=yes,clearcache=yes');
    ref.addEventListener('loadstart', function(event) {
      if((event.url).indexOf(redirectURI) == 0) {
        ref.close();
        var code = (event.url).split("code=")[1];
        continueAuth(code).then(function(){
          getUserInfo()
          getReviews()
        }, function(error){
          alert(error)
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
      accessToken = data.access_token
      $localStorage.accessToken = accessToken
      deferred.resolve()
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
    var reviewFactory = function(review, owner) {
      return {id: review.id, title: review.title, total_articles: review.total_articles,
        blind: review.is_blind, owner: owner, users_count: review.users_count}
    }

    return request('GET', '/api/v1/reviews')
      .then(function(data){
        console.log("got data from getReviews", data)
        $localStorage.reviews = _.map(data.owned_reviews, function(review){
          return reviewFactory(review, true)
        }).concat(_.map(data.collab_reviews, function(review) {
          return reviewFactory(review, false)
        }))
        console.log("refreshed reviews: ", $localStorage.reviews.length)        
        return $localStorage.reviews
      })
  }

  var getFacets = function(reviewId) {
    return requestReviewEndpoint('GET', '/api/v1/reviews/'+reviewId+'/facets', reviewId)
      .then(function(data) {
        console.log("in getFacets, data:", data)
        data.review.facets = processFacets(data.data)
        return data.review.facets
      })
  }

  var processFacets = function(facets) {
    var allLabels = facets.all_labels.collection
    var labels = [], reasons = []
    _.each(allLabels, function(labelFacetRow){
      var key = labelFacetRow[0]
      if (key.match(/^__EXR__/))
        reasons.push({display: key.replace(/^__EXR__/, ''), key: key, count: labelFacetRow[2]})
      else
        labels.push({display: key, key: key, count: labelFacetRow[2]})
    })
    facets.labels = labels
    facets.reasons = reasons
    return facets
  }

  var getArticles = function(reviewId, filters) {

  }

  var toggleBlind = function(reviewId) {
    return requestReviewEndpoint('POST', '/api/v1/reviews/'+reviewId+'/blind', reviewId)
      .then(function(data){
        review.blind = data.is_blind
      })
  }

  return {
    login: function() {
      if (!window.cordova) {
        // testing on browser, cheat accessToken
        accessToken = "c10646fe6391ae5534bf5381a6ba06828b20c34c6c71dd3cd23d586a1a01bbd0"
        $localStorage.accessToken = accessToken
        getUserInfo()
        getReviews()
      }
      else
        startAuth()
    },
    logout: function() {
      $localStorage.$reset();
      // TODO revoke token
    },
    loggedIn: function() {
      return $localStorage.accessToken != null
    },
    getDisplayName: function() {
      return $localStorage.displayName;
    },
    getCachedReviews: function() {
      return $localStorage.reviews || []
    },
    getReviews: function() {
      return getReviews()
    },
    getFacets: function(reviewId) {
      return getFacets(reviewId)
    },
    getArticles: function(reviewId, filters) {
      return getArticles(reviewId, filters)
    },
    getNextArticle: function(reviewId) {
      var index = (++lastArticle)%(fakeArticles.length)
      console.log(index)
      return fakeArticles[index]
    },
    getPreviousArticle: function(reviewId) {
      var index = (--lastArticle)%(fakeArticles.length)
      if (index < 0) index = 2;
      console.log(index)
      return fakeArticles[index]
    },
    customizeArticle: function(reviewId, articleId, key, value) {

    },
    toggleBlind: function(reviewId) {
      return toggleBlind(reviewId)
    }
  }
})
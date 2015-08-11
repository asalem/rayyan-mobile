angular.module('rayyan.services', [])

.factory('rayyanAPIService', function($http, $localStorage, $q) {

  var clientId = "b174200899509ee7a4d90d7457c6ea63bbb8a79ed1059753adc100bd0b685d63"
  var clientSecret = "e1f17b03e0e36446917e50598544cff58dff03ea48dd1d5ee364fdb7d9f6f19a"
  var redirectURI = "http://localhost/callback"
  // var baseURI = "http://127.0.0.1:5000"
  var baseURI = "http://192.168.100.10:5000"
  var postURI = baseURI + "/oauth/authorize"
  var authorizeURI = postURI + "?client_id="+clientId+"&redirect_uri="+redirectURI+"&response_type=code"
  var accessToken = $localStorage.accessToken

  $http.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';
  // TODO load accesstoken/reviews/... from localStorage

  // https://blog.nraboy.com/2014/07/using-oauth-2-0-service-ionicframework/

  var startAuth = function() {
    var ref = window.open(authorizeURI, '_blank', 'location=no,clearsessioncache=yes,clearcache=yes');
    ref.addEventListener('loadstart', function(event) {
      if((event.url).indexOf(redirectURI) == 0) {
        ref.close();
        var code = (event.url).split("code=")[1];
        continueAuth(code);
      }
    });
  }

  var continueAuth = function(code) {
    $http({method: "POST", url: baseURI + "/oauth/token", data: "client_id=" + clientId + "&client_secret=" + clientSecret + "&redirect_uri=" + redirectURI + "&grant_type=authorization_code" + "&code=" + code })
    .success(function(data) {
      // deferred.resolve(data);
      accessToken = data.access_token
      $localStorage.accessToken = accessToken
      getUserInfo()
      getReviews()
    })
    .error(function(data, status) {
      // deferred.reject("Problem authenticating");
      alert("Error authenticating user")
    })
  }

  var getUserInfo = function() {
    $http({method: "GET", url: baseURI + "/api/v1/user_info?access_token=" + accessToken})
    .success(function(user_info) {
      $localStorage.displayName = user_info.displayName
    })
    .error(function(data, status) {
      $localStorage.displayName = "Unknown"
      alert("Error retrieving user information")
    })
  }

  var getReviews = function() {
    var deferred = $q.defer()
    $http({method: "GET", url: baseURI + "/api/v1/reviews?access_token=" + accessToken})
    .success(function(data, status) {
      var reviews = []
      angular.forEach(data.owned_reviews, function(review){
        reviews.push({id: review.id, title: review.title, total_articles: review.total_articles, owner: true})
      })
      angular.forEach(data.collab_reviews, function(review){
        reviews.push({id: review.id, title: review.title, total_articles: review.total_articles, owner: false})
      })
      $localStorage.reviews = reviews
      console.log("refreshed reviews: ", reviews.length)
      deferred.resolve(reviews)
    })
    .error(function(data, status) {
      deferred.reject(status)
      // $localStorage.reviews = []
      // alert("Error [" + status + "] " + (data ? data.toSource() : "null"))
    })
    return deferred.promise
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
    getArticle: function(reviewId) {

    },
    customizeArticle: function(reviewId, articleId, key, value) {

    }
  }
})
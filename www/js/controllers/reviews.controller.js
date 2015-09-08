angular.module('reviews.controller', ['chart.js', 'rayyan.services'])

.controller('ReviewsController', function($rootScope, $scope, $location, 
  rayyanAPIService, $ionicListDelegate, $localStorage, $ionicPopup) {

  $rootScope.reviewFullyDownloaded = function(review) {
    return review.total_articles > 0 && review.downloaded_articles >= review.total_articles
  }

  var setReviews = function(reviews) {
    $rootScope.reviews = reviews
    var groups = _.partition(reviews, $rootScope.reviewFullyDownloaded)
    $rootScope.reviewGroups = [
      {
        reviews: groups[0],
        name: "Downloaded",
        emptyMessage: "Reviews that you download from below will appear here. "
          + "Once downloaded, you can do your screening as usual, even if your are offline. "
          + "The next time you are online, it will sync automatically to Rayyan servers. "
          + "To clear a downloaded review, just swipe it to the left."
      },
      {
        reviews: groups[1],
        name: "Online",
        emptyMessage: "You have no reviews yet, create one from Rayyan website."
      }
    ]
  }

  $scope.lastUpdatedAt = $localStorage.lastUpdatedAt ? moment($localStorage.lastUpdatedAt).calendar() : '--'

  $rootScope.refreshReviews = function() {
    rayyanAPIService.getReviews()
      .then(function(reviews){
        // online: remote reviews
        setReviews(reviews)
        $localStorage.lastUpdatedAt = new Date()
        $scope.lastUpdatedAt = moment().calendar()
      },
      function(error) {
        // offline: fallback to local reviews
      },
      function(reviews) {
        // notified with local reviews, will be needed if offline
        setReviews(reviews)
        // show local inclusion facets asap
        _.each($rootScope.reviews, function(review){
          rayyanAPIService.getFacets(review, ["inclusions"], "local")
        })
      })
      .finally(function(){
        //Stop the ion-refresher from spinning
        $scope.$broadcast('scroll.refreshComplete');
        // get all facets (for downloaded reviews) or just inclusions for others
        // if online, they will go through remote server, otherwise from local db
        _.each($rootScope.reviewGroups[0].reviews, function(review){
          rayyanAPIService.getFacets(review)
        })
        _.each($rootScope.reviewGroups[1].reviews, function(review){
          rayyanAPIService.getFacets(review, ["inclusions"])
        })
      })
  }

  $scope.chartColors = ['#008000', '#FF0000', '#D3D3D3'];

  $scope.shouldDrawChart = function(review) {
    return review.total_articles > 0 
      && review.filters
      && review.filters.inclusions
      && review.filters.inclusions[0]
      && review.filters.inclusions[1]
      && review.filters.inclusions[2]
      && review.filters.inclusions[0].count 
        + review.filters.inclusions[1].count 
        + review.filters.inclusions[2].count > 0
  }

  $scope.drawChartText = function() {
    // coresty: http://www.jjcosgrove.com/article/chart-js-doughnut-with-centered-percentage/
    //put the pabel together based on the given 'skilled' percentage
    var included = this.segments[0].value,
        excluded = this.segments[1].value,
        undecided = this.segments[2].value,
        decided = included + excluded;
    var valueLabel = Math.round(100 * decided / (decided + undecided)) + '%';

    //setup the font and center it's position
    if (undecided == 0) return;
    this.chart.ctx.font = 'Bold 16px Verdana';
    this.chart.ctx.fillStyle = '#000';
    this.chart.ctx.textAlign = 'center';
    this.chart.ctx.textBaseline = 'middle';

    //find the center point
    var x = this.chart.width / 2;
    var y = this.chart.height / 2;

    //hack to center different fonts
    var x_fix = 0;
    var y_fix = 2;

    //render the text
    this.chart.ctx.fillText(valueLabel, x + x_fix, y + y_fix);
  }

  $scope.$on('$ionicView.enter', function(e) {
    if (!rayyanAPIService.loggedIn()) {
      $location.path("/app/login")
    }
  });

  $scope.$on("rayyan.ready", function() {  
    if (rayyanAPIService.loggedIn())
      $rootScope.refreshReviews()
  })

  $scope.reviewClicked = function(review) {
    if (review.total_articles > 0) {
      $rootScope.review = review;
      $location.path("/app/reviews/"+review.rayyan_id+"/articles")
    }
  }

  $scope.downloadPercent = function(review) {
    return Math.round(review.downloaded_articles * 100 / review.total_articles);
  }

  $scope.reviewIcon = function(review) {
    if (review.total_articles == 0 || review.download_pending)
      return "";
    else if (review.download_error)
      return "ion-alert-circled review-download-error"
    else if (review.downloaded_articles >= review.total_articles)
      return "";
    else
      return ionic.Platform.isIOS() ? 'ion-ios-cloud-download-outline' : 'ion-android-download';
  }

  $scope.iconClicked = function($event, review) {
    if (review.downloaded_articles >= review.total_articles)
      return;
    else if (review.download_pending) {
      console.log("stop download")
      rayyanAPIService.cancelDownloadReviewArticles(review);
    }
    else {
      console.log("start download")

      rayyanAPIService.getFacets(review, null, "remote")

      rayyanAPIService.downloadReviewArticles(review)
        .then(function(){
          // to move downloaded review to the offline group
          setReviews($rootScope.reviews)
        }, function(error){
          var message = ""
          switch(error) {
            case "articles_etag_changed":
              message = "Review is being updated on the server, please wait until it is done then refresh this page and try again"
              break;
            case "server_error":
              message = "Error connecing to the server, please try again later"
              break;
            default:
              message = "Unknown error"
          }
          $ionicPopup.alert({
            title: "Error",
            template: message
          })
        })
    }
    $event.preventDefault();
    $event.stopPropagation();
  }

  $scope.clearReviewArticles = function(review) {
    rayyanAPIService.clearReviewArticles(review)
    // to move cleared review to the online group
    setReviews($rootScope.reviews)
    $ionicListDelegate.closeOptionButtons();
  }

});
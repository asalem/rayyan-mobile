angular.module('reviews.controller', ['chart.js', 'rayyan.services'])

.controller('ReviewsController', function($rootScope, $scope, $location, rayyanAPIService, $ionicListDelegate) {

  var reviewFullyDownloaded = function(review) {
    return review.total_articles > 0 && review.downloaded_articles >= review.total_articles
  }

  var getReviewFacets = function(review) {
    rayyanAPIService.getFacets(review, ["inclusions", "labels", "topics", "highlights"])
  }

  var setReviews = function(reviews) {
    $rootScope.reviews = reviews
    var groups = _.partition(reviews, reviewFullyDownloaded)
    $rootScope.reviewGroups = [
      {
        reviews: groups[0],
        name: "Offline",
        emptyMessage: "Reviews that you download will appear here"
      },
      {
        reviews: groups[1],
        name: "Online",
        emptyMessage: "You have no reviews yet, create one from Rayyan website"
      }
    ]
  }

  $scope.doRefresh = function() {
    rayyanAPIService.getReviews()
      .then(function(reviews){
        // remote reviews
        setReviews(reviews)
        // we are online, chance to get all facets (for downloaded reviews) or just inclusions for others
        _.each(reviews, function(review){
          if (reviewFullyDownloaded(review))
            getReviewFacets(review)
          else
            rayyanAPIService.getFacets(review, ["inclusions"])
        })
      },
      function(error) {
        // offline, get inclusions for all reviews, should get from local db regardless of the dirty flag
        // TODO MAKE SURE IT WORKS WITH NEW GROUPING
        _.each($rootScope.reviews, function(review){
          rayyanAPIService.getFacets(review, ["inclusions"])
        })
      },
      function(reviews) {
        // local reviews
        setReviews(reviews)
      })
      .finally(function(){
        //Stop the ion-refresher from spinning
        $scope.$broadcast('scroll.refreshComplete');
      })
  }

  $scope.chartColors = ['#008000', '#FF0000', '#D3D3D3'];

  $scope.shouldDrawChart = function(review) {
    return review.total_articles > 0 
      && review.inclusions
      && review.inclusions[0]
      && review.inclusions[1]
      && review.inclusions[2]
      && review.inclusions[0].count 
        + review.inclusions[1].count 
        + review.inclusions[2].count > 0
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
    var fontSize = undecided == 0 ? '30' : '40';
    this.chart.ctx.font = 'Bold '+fontSize+'pt Verdana';
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

  if (rayyanAPIService.loggedIn())
    $scope.doRefresh()

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
      return "ion-checkmark-circled review-downloaded-all";
    else
      return ionic.Platform.isIOS() ? 'ion-ios-cloud-download-outline' : 'ion-android-download';
  }

  $scope.iconClicked = function($event, review) {
    if (review.total_articles == review.downloaded_articles)
      return;
    else if (review.download_pending) {
      console.log("stop download")
      rayyanAPIService.cancelDownloadReviewArticles(review);
    }
    else {
      console.log("start download")

      getReviewFacets(review)

      rayyanAPIService.downloadReviewArticles(review)
        .then(function(){
          // to move downloaded review to the offline group
          setReviews($rootScope.reviews)
        }, function(error){
          switch(error) {
            case "articles_etag_changed":
              alert("Review is being updated on the server, please wait until it is done then refresh this page and try again")
              break;
            case "server_error":
              alert("Error connecing to the server, please try again later")
              break;
          }
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
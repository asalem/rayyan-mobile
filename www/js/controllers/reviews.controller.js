angular.module('reviews.controller', ['chart.js', 'rayyan.services'])

.controller('ReviewsController', function($rootScope, $scope, $location, rayyanAPIService, $ionicListDelegate) {

  $scope.doRefresh = function() {
    rayyanAPIService.getReviews()
      .then(function(reviews){
        // remote reviews
        $rootScope.reviews = reviews
      }, null, function(reviews){
        // local reviews
        $rootScope.reviews = reviews
      })
      .finally(function(){
        //Stop the ion-refresher from spinning
        $scope.$broadcast('scroll.refreshComplete');
      })
  }

  $scope.getReviewUndecidedCount = function(review) {
    return Math.max(0, review.total_articles - review.included - review.excluded);
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
      rayyanAPIService.downloadReviewArticles(review)
        .catch(function(error){
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
    rayyanAPIService.clearReviewArticles(review);
    $ionicListDelegate.closeOptionButtons();
  }

});
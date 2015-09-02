angular.module('footer.controller', ['rayyan.services'])

.controller('FooterController', function($scope, $rootScope, rayyanAPIService, $ionicPlatform, $timeout) {

  var journalTimer;

  var processJournal = function() {
    console.log("Processing journal...")
    if ($scope.journalProcessing) return;
    $scope.journalProcessing = true
    rayyanAPIService.processJournalPlans()
      .then(function(){
        $scope.journalProcessing = false;
        journalTimer = $timeout(null, 60000)
          .then(processJournal);
      }, null, function(pendingActionsCount){
        console.log("pendingActionsCount", pendingActionsCount)
        $rootScope.pendingActionsCount = pendingActionsCount;
        // try{$scope.$apply();}catch(e){}
      })
  }

  var setConnectionStatus = function(status) {
    $scope.connectionStatus = status;
    if (status == 'online') {
      $scope.footerText = "Online"
    }
    else if (status == 'offline') {
      $scope.footerText = "Offline"
    }
    console.log("network", status);
    // manually call $apply because $ionicPlatform.on happens outside angular loop
    $scope.$apply();
  }

  $ionicPlatform.on("online", function(){
    setConnectionStatus('online');
    $timeout.cancel(journalTimer);
    processJournal();
  })

  $ionicPlatform.on("offline", function(){
    setConnectionStatus('offline');
    $timeout.cancel(journalTimer);
  })

  $ionicPlatform.ready(function() {
    if (window.cordova) {
      if (navigator.connection.type == Connection.NONE) {
        setConnectionStatus('offline');
      }
      else {
        setConnectionStatus('online');
        processJournal();
      }
    }
  })

  $scope.pendingActionsText = function() {
    var count = $rootScope.pendingActionsCount
    if (count == 0)
      return "";
    else
      return count + " action" + (count > 1 ? 's' : '') + " pending"
  }

  $scope.footerClicked = function() {
    processJournal();
  }

  $rootScope.pendingActionsCount = 0;
  $scope.footerText = "Checking connection...";
  // TODO: connection status for !window.cordova
  // setConnectionStatus('offline');

  rayyanAPIService.getJournalPendingActionsCount()
    .then(function(count){
      $rootScope.pendingActionsCount = count
    })

})

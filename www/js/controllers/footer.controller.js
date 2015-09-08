angular.module('footer.controller', ['rayyan.services'])

.controller('FooterController', function($scope, $rootScope, rayyanAPIService, $ionicPlatform, $timeout) {

  var journalTimer;

  $scope.journalProcessing = false

  var processJournal = function() {
    if ($scope.journalProcessing) return;
    console.log("Processing journal...")
    $scope.journalProcessing = true
    rayyanAPIService.processJournalPlans()
      .then(function(){
        journalTimer = $timeout(null, 60000)
          .then(processJournal);
      }, null, function(pendingActionsCount){
        console.log("pendingActionsCount", pendingActionsCount)
        $rootScope.pendingActionsCount = pendingActionsCount;
        // try{$scope.$apply();}catch(e){}
      })
      .finally(function(){
        console.log("Finished processing journal")
        $scope.journalProcessing = false;
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
    else {
      console.log("browser, no Cordova, not initializing network information")
      // TODO: connection status for browser
      // setConnectionStatus('online');
    }
  })

  $scope.journalProcessingIcon = function() {
    return ionic.Platform.isIOS() ? 'ion-ios-loop-strong' : 'ion-android-sync';
  }

  $scope.pendingActionsIcon = function() {
    return ionic.Platform.isIOS() ? 'ion-ios-cloud-upload' : 'ion-android-upload';
  }

  $scope.footerClicked = function() {
    processJournal();
  }

  $rootScope.pendingActionsCount = 0;
  $scope.footerText = "Checking connection...";

  rayyanAPIService.getJournalPendingActionsCount()
    .then(function(count){
      $rootScope.pendingActionsCount = count
    })

})

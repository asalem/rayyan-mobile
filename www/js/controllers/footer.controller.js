angular.module('footer.controller', ['rayyan.services'])

.controller('FooterController', function($scope, $rootScope, rayyanAPIService, $ionicPlatform) {

  $scope.journalProcessing = false

  var processJournal = function() {
    if ($scope.journalProcessing) return;
    console.log("processJournalPlans starting...")
    $scope.journalProcessing = true
    rayyanAPIService.processJournalPlans()
      .then(function(){
        console.log("processJournalPlans success")
      }, function(error){
        console.log("processJournalPlans error", error)
      }, function(pendingActionsCount){
        console.log("processJournalPlans notification, pendingActionsCount", pendingActionsCount)
        $rootScope.pendingActionsCount = pendingActionsCount;
        // try{$scope.$apply();}catch(e){}
      })
      .finally(function(){
        console.log("processJournalPlans finally")
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

  // $ionicPlatform.ready(function() {
  $scope.$on("rayyan.ready", function() {
    if (window.cordova) {
      if (navigator.connection.type == Connection.NONE) {
        setConnectionStatus('offline');
        // initially offline, display pending count
        rayyanAPIService.getJournalPendingActionsCount()
          .then(function(count){
            $rootScope.pendingActionsCount = count
          })

      }
      else {
        // initially online, processJournal which will in turn display pending count
        setConnectionStatus('online');
        processJournal();
      }
    }
    else {
      console.log("browser, no Cordova, not initializing network information")
      // TODO: connection status for browser
      // setConnectionStatus('online');
    }

    $ionicPlatform.on("online", function(){
      setConnectionStatus('online');
      processJournal();
    })

    $scope.footerClicked = function() {
      processJournal();
    }

  })

  $ionicPlatform.on("offline", function(){
    setConnectionStatus('offline');
  })

  $scope.journalProcessingIcon = function() {
    return ionic.Platform.isIOS() ? 'ion-ios-loop-strong' : 'ion-android-sync';
  }

  $scope.pendingActionsIcon = function() {
    return ionic.Platform.isIOS() ? 'ion-ios-cloud-upload' : 'ion-android-upload';
  }

  $rootScope.pendingActionsCount = 0;
  $scope.footerText = "Initializing...";

})

M.Journal = persistence.define('Journal', {
  review_id: "INT",
  article_id: "INT",
  plan: "JSON",
  timestamp: "DATE"
});

M.appendJournalPlan = function(review, article, plan, $q) {
  var now = new Date()
  var deferred = $q.defer()
  var j = new M.Journal({
    review_id: review.rayyan_id,
    article_id: article.rayyan_id,
    plan: plan,
    timestamp: now
  })
  persistence.add(j)

  persistence.flush(function(){
    deferred.resolve(j);
  })

  return deferred.promise;
}

M.getJournalPendingActionsCount = function($q) {
  var deferred = $q.defer()
  M.Journal.all().count(null, function(count){
    deferred.resolve(count);
  })
  return deferred.promise;
}

M.getJournalPendingActionsBatch = function(batchSize, $q) {
  var deferred = $q.defer()
  M.Journal.all()
    .limit(batchSize)
    .order("timestamp", true)
    .list(null, function(actions){
      deferred.resolve(actions);
    })
  return deferred.promise;
}

M.removeJournalActions = function(ids, $q) {
  var deferred = $q.defer()
  M.Journal.all()
    .filter("id", "in", ids)
    .destroyAll(null, function(){
      deferred.resolve();
    })
  return deferred.promise;
}

M.removeJournalAction = function(journalAction, $q) {
  var deferred = $q.defer()
  persistence.remove(journalAction)
  persistence.flush(function(){
    deferred.resolve();
  })
  return deferred.promise;
}


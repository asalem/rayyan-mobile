persistence.defineMigration(4, {
  up: function() {
    this.createTable('Journal', function(t){
      t.integer('review_id');
      t.integer('article_id');
      t.json('plan');
      t.date('timestamp');
    });
    this.addIndex('Journal', 'timestamp');
  },
  down: function() {
    this.dropTable('Journal');
  }
});

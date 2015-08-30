persistence.defineMigration(1, {
  up: function() {
    this.createTable('Review', function(t){
      t.integer('rayyan_id');
      t.text('title');
      t.integer('total_articles');
      t.integer('downloaded_articles');
      t.integer('included');
      t.integer('excluded');
      t.text('articles_etag');
      t.boolean('blind');
      t.boolean('owner');
      t.integer('users_count');
    });
    this.addIndex('Review', 'rayyan_id');
  },
  down: function() {
    this.dropTable('Review');
  }
});

persistence.defineMigration(2, {
  up: function() {
    this.createTable('Article', function(t){
      t.text('title');
      t.integer('rayyan_id');
      t.text('citation');
      t.text('full_abstract');
      t.text('authors');
    });
    this.addIndex('Article', 'rayyan_id');

    // M-M article-review
    this.createTable('Article_reviews_Review');
    // persistence UUID foreign keys
    this.addColumn('Article_reviews_Review', 'Review_articles', 'VARCHAR(32)')
    this.addColumn('Article_reviews_Review', 'Article_reviews', 'VARCHAR(32)')
    this.addIndex('Article_reviews_Review', 'Review_articles');
    this.addIndex('Article_reviews_Review', 'Article_reviews');
  },
  down: function() {
    this.dropTable('Article_reviews_Review');
    this.dropTable('Article');
  }
});

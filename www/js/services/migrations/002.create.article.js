persistence.defineMigration(2, {
  up: function() {
    this.createTable('Article', function(t){
      t.text('title');
      t.integer('rayyan_id');
      t.text('citation');
      t.text('full_abstract');
      t.text('authors');
      t.text('topics');
    });
    this.addColumn('Article', 'review', 'VARCHAR(32)')
    this.addIndex('Article', 'rayyan_id');
    this.addIndex('Article', 'review');
    this.addIndex('Article', 'title');
    this.addIndex('Article', 'full_abstract');
    this.addIndex('Article', 'authors');
    this.addIndex('Article', 'topics');
  },
  down: function() {
    this.dropTable('Article');
  }
});

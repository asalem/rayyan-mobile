persistence.defineMigration(2, {
  up: function() {
    this.createTable('Article', function(t){
      t.text('title');
      t.integer('rayyan_id');
      t.text('citation');
      t.text('full_abstract');
      t.text('authors');
    });
    this.addColumn('Article', 'review', 'VARCHAR(32)')
    this.addIndex('Article', 'rayyan_id');
    this.addIndex('Article', 'review');
  },
  down: function() {
    this.dropTable('Article');
  }
});

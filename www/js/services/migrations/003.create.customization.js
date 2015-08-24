persistence.defineMigration(3, {
  up: function() {
    this.createTable('Customization', function(t){
      t.integer('review_id');
      t.integer('article_id');
      t.text('key');
      t.integer('value');
    });
    this.addColumn('Customization', 'article', 'VARCHAR(32)')
    this.addColumn('Customization', 'review', 'VARCHAR(32)')
    this.addIndex('Customization', 'review_id');
    this.addIndex('Customization', 'article_id');
    this.addIndex('Customization', 'key');
    this.addIndex('Customization', 'article');
    this.addIndex('Customization', 'review');
  },
  down: function() {
    this.dropTable('Customization');
  }
});

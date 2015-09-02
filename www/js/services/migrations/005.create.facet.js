persistence.defineMigration(5, {
  up: function() {
    this.createTable('Facet', function(t){
      t.integer('review_id');
      t.text('type')
      t.text('value')
      t.text('display')
      t.integer('count')
    });
    this.addColumn('Facet', 'review', 'VARCHAR(32)')
    this.addIndex('Facet', 'review_id');
    this.addIndex('Facet', 'review');
    this.addIndex('Facet', 'type');
    this.addIndex('Facet', 'count');
  },
  down: function() {
    this.dropTable('Facet');
  }
});

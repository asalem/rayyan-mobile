persistence.defineMigration(1, {
  up: function() {
    this.createTable('Review', function(t){
      t.integer('rayyan_id');
      t.text('title');
      t.integer('total_articles');
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

class AddRegistersCountToArticles < ActiveRecord::Migration[5.0]
  def change
    add_column :articles, :registers_count, :integer, default: 0
  end
end

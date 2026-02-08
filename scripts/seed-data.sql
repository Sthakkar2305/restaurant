-- Seed demo data for Restaurant POS System

-- Insert demo users
INSERT INTO users (email, password_hash, full_name, role, is_active) VALUES
('demo@restaurant.com', '$2b$10$Y9o6aQP6Zw1Q8Z8Z8Z8Z8.z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', 'Demo Waiter', 'waiter', true),
('admin@restaurant.com', '$2b$10$Y9o6aQP6Zw1Q8Z8Z8Z8Z8.z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', 'Admin Manager', 'admin', true)
ON CONFLICT (email) DO NOTHING;

-- Insert menu categories
INSERT INTO menu_categories (name, icon, display_order) VALUES
('Starters', '🥘', 1),
('Main Course', '🍽️', 2),
('Bread', '🍞', 3),
('Drinks', '🥤', 4),
('Desserts', '🍰', 5)
ON CONFLICT (name) DO NOTHING;

-- Get category IDs
WITH cats AS (
  SELECT id, name FROM menu_categories
)
-- Insert menu items
INSERT INTO menu_items (name, description, price, category_id, is_available, dietary_tags) 
SELECT 
  'Samosa', 'Crispy pastry filled with spiced potatoes and peas', 80, cats.id, true, ARRAY['vegan']
FROM cats WHERE cats.name = 'Starters'
ON CONFLICT DO NOTHING;

WITH cats AS (
  SELECT id, name FROM menu_categories
)
INSERT INTO menu_items (name, description, price, category_id, is_available, dietary_tags) 
SELECT 
  'Paneer Tikka', 'Cottage cheese marinated in spices and grilled', 220, cats.id, true, ARRAY['vegetarian', 'spicy']
FROM cats WHERE cats.name = 'Starters'
ON CONFLICT DO NOTHING;

WITH cats AS (
  SELECT id, name FROM menu_categories
)
INSERT INTO menu_items (name, description, price, category_id, is_available, dietary_tags) 
SELECT 
  'Chicken Biryani', 'Aromatic rice cooked with spiced chicken', 350, cats.id, true, ARRAY['non-vegetarian']
FROM cats WHERE cats.name = 'Main Course'
ON CONFLICT DO NOTHING;

WITH cats AS (
  SELECT id, name FROM menu_categories
)
INSERT INTO menu_items (name, description, price, category_id, is_available, dietary_tags) 
SELECT 
  'Paneer Butter Masala', 'Soft cottage cheese in creamy tomato sauce', 280, cats.id, true, ARRAY['vegetarian']
FROM cats WHERE cats.name = 'Main Course'
ON CONFLICT DO NOTHING;

WITH cats AS (
  SELECT id, name FROM menu_categories
)
INSERT INTO menu_items (name, description, price, category_id, is_available, dietary_tags) 
SELECT 
  'Naan', 'Traditional Indian bread', 60, cats.id, true, ARRAY['vegetarian']
FROM cats WHERE cats.name = 'Bread'
ON CONFLICT DO NOTHING;

WITH cats AS (
  SELECT id, name FROM menu_categories
)
INSERT INTO menu_items (name, description, price, category_id, is_available, dietary_tags) 
SELECT 
  'Roti', 'Whole wheat flatbread', 40, cats.id, true, ARRAY['vegan']
FROM cats WHERE cats.name = 'Bread'
ON CONFLICT DO NOTHING;

WITH cats AS (
  SELECT id, name FROM menu_categories
)
INSERT INTO menu_items (name, description, price, category_id, is_available, dietary_tags) 
SELECT 
  'Mango Lassi', 'Yogurt-based mango drink', 80, cats.id, true, ARRAY['vegetarian']
FROM cats WHERE cats.name = 'Drinks'
ON CONFLICT DO NOTHING;

WITH cats AS (
  SELECT id, name FROM menu_categories
)
INSERT INTO menu_items (name, description, price, category_id, is_available, dietary_tags) 
SELECT 
  'Iced Tea', 'Refreshing chilled tea', 60, cats.id, true, ARRAY['vegan']
FROM cats WHERE cats.name = 'Drinks'
ON CONFLICT DO NOTHING;

WITH cats AS (
  SELECT id, name FROM menu_categories
)
INSERT INTO menu_items (name, description, price, category_id, is_available, dietary_tags) 
SELECT 
  'Gulab Jamun', 'Sweet milk solids in sugar syrup', 120, cats.id, true, ARRAY['vegetarian']
FROM cats WHERE cats.name = 'Desserts'
ON CONFLICT DO NOTHING;

WITH cats AS (
  SELECT id, name FROM menu_categories
)
INSERT INTO menu_items (name, description, price, category_id, is_available, dietary_tags) 
SELECT 
  'Kheer', 'Rice pudding with milk and cardamom', 100, cats.id, true, ARRAY['vegetarian']
FROM cats WHERE cats.name = 'Desserts'
ON CONFLICT DO NOTHING;

-- Insert restaurant tables
INSERT INTO restaurant_tables (table_number, seating_capacity, status)
VALUES
(1, 2, 'available'),
(2, 2, 'available'),
(3, 4, 'available'),
(4, 4, 'available'),
(5, 4, 'available'),
(6, 6, 'available'),
(7, 6, 'available'),
(8, 8, 'available'),
(9, 2, 'available'),
(10, 4, 'available')
ON CONFLICT (table_number) DO NOTHING;

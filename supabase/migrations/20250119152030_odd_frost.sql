/*
  # Initial Schema Setup for Admin Portal

  1. Tables
    - regions
    - categories
    - sub_categories
    - products
    - product_colors
    - product_care_instructions
    - region_category_mappings
    - region_subcategory_mappings
    - region_product_mappings

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated admin access
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Regions Table
CREATE TABLE IF NOT EXISTS regions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  locale text NOT NULL,
  code text UNIQUE NOT NULL,
  image_url_1 text,
  image_url_2 text,
  image_url_3 text,
  image_url_4 text,
  address_1 text,
  address_2 text,
  contact_no_1 text,
  contact_no_2 text,
  email_1 text,
  email_2 text,
  whatsapp_no text,
  city text,
  country text,
  map_url text,
  icon_url text,
  enable_business_hours boolean DEFAULT false,
  business_hours jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  image_url text,
  icon_url text,
  order_position integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Sub Categories Table
CREATE TABLE IF NOT EXISTS sub_categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  image_url text,
  icon_url text,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  order_position integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  image_url text NOT NULL,
  subcategory_id uuid REFERENCES sub_categories(id) ON DELETE CASCADE,
  price numeric,
  is_active boolean DEFAULT true,
  reference text,
  composition text,
  technique text,
  width text,
  weight text,
  martindale text,
  repeats text,
  end_use text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Product Colors Table
CREATE TABLE IF NOT EXISTS product_colors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  name text NOT NULL,
  color_code text NOT NULL,
  image_url text NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Product Care Instructions Table
CREATE TABLE IF NOT EXISTS product_care_instructions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  icon text NOT NULL,
  instruction text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Region Category Mappings Table
CREATE TABLE IF NOT EXISTS region_category_mappings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  region_id uuid REFERENCES regions(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(region_id, category_id)
);

-- Region SubCategory Mappings Table
CREATE TABLE IF NOT EXISTS region_subcategory_mappings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  region_id uuid REFERENCES regions(id) ON DELETE CASCADE,
  subcategory_id uuid REFERENCES sub_categories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(region_id, subcategory_id)
);

-- Region Product Mappings Table
CREATE TABLE IF NOT EXISTS region_product_mappings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  region_id uuid REFERENCES regions(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(region_id, product_id)
);

-- Enable Row Level Security
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_care_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE region_category_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE region_subcategory_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE region_product_mappings ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (admin)
CREATE POLICY "Allow full access for authenticated users" ON regions
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow full access for authenticated users" ON categories
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow full access for authenticated users" ON sub_categories
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow full access for authenticated users" ON products
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow full access for authenticated users" ON product_colors
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow full access for authenticated users" ON product_care_instructions
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow full access for authenticated users" ON region_category_mappings
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow full access for authenticated users" ON region_subcategory_mappings
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow full access for authenticated users" ON region_product_mappings
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_regions_updated_at
    BEFORE UPDATE ON regions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sub_categories_updated_at
    BEFORE UPDATE ON sub_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_colors_updated_at
    BEFORE UPDATE ON product_colors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_care_instructions_updated_at
    BEFORE UPDATE ON product_care_instructions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardMedia,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
  Tooltip
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Image as ImageIcon } from '@mui/icons-material';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import FilterSearch from '../components/FilterSearch';
import { uploadImage } from '../lib/cloudinary';

interface Category {
  id: string;
  name: string;
}

interface SubCategory {
  id: string;
  name: string;
  category_id: string;
  category?: Category;
}

interface Region {
  id: number;
  name: string;
}

interface RegionProductMapping {
  id: number;
  product_id: number;
  region_id: number;
  region: Region;
}

interface ProductColor {
  id: number;
  product_id: number;
  name: string;
  color_code: string;
  image_url: string;
  is_default: boolean;
}

interface ProductCareInstruction {
  id: number;
  product_id: number;
  instruction: string;
  icon: string;
}

interface Product {
  id: number;
  name: string;
  description?: string;
  subcategory_id: number;
  subcategory?: SubCategory;
  price?: string;
  is_active: boolean;
  reference?: string;
  composition?: string;
  technique?: string;
  width?: string;
  weight?: string;
  martindale?: string;
  repeats?: string;
  end_use?: string;
  image_url?: string;
  region_product_mapping?: RegionProductMapping[];
  product_colors?: ProductColor[];
  product_care_instructions?: ProductCareInstruction[];
}

interface ProductFormData {
  name: string;
  description: string;
  subcategory_id: number;
  price: string;
  is_active: boolean;
  reference: string;
  composition: string;
  technique: string;
  width: string;
  weight: string;
  martindale: string;
  repeats: string;
  end_use: string;
  image_url: string;
  region_ids: number[];
  image?: File;
  colors: {
    color_name: string;
    color_code: string;
    image_url: string;
    is_default: boolean;
    image?: File;
  }[];
  care_instructions: string[];
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [filteredSubCategories, setFilteredSubCategories] = useState<SubCategory[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [imageTab, setImageTab] = useState(0);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegions, setSelectedRegions] = useState<Region[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    subcategory_id: 0,
    price: '',
    is_active: true,
    reference: '',
    composition: '',
    technique: '',
    width: '',
    weight: '',
    martindale: '',
    repeats: '',
    end_use: '',
    image_url: '',
    region_ids: [],
    colors: [],
    care_instructions: [],
  });

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', flex: 1 },
    { 
      field: 'category',
      headerName: 'Category',
      flex: 1,
      valueGetter: (params) => params.row.subcategory?.category?.name || 'N/A',
    },
    {
      field: 'subcategory',
      headerName: 'Subcategory',
      flex: 1,
      valueGetter: (params) => params.row.subcategory?.name || 'N/A',
    },
    {
      field: 'regions',
      headerName: 'Regions',
      flex: 1,
      renderCell: (params) => (
        <Box display="flex" gap={0.5}>
          {params.row.region_product_mapping?.map((rpm: RegionProductMapping) => (
            <Chip key={rpm.region.id} label={rpm.region.name} size="small" />
          )) || 'N/A'}
        </Box>
      ),
    },
    {
      field: 'colors',
      headerName: 'Colors',
      flex: 1,
      renderCell: (params) => (
        <Box display="flex" gap={0.5} alignItems="center">
          {params.row.product_colors?.map((color: ProductColor) => (
            <Tooltip
              key={color.id}
              title={
                <Box>
                  <Typography variant="caption" display="block">{color.name}</Typography>
                  {color.is_default && (
                    <Typography variant="caption" display="block" color="primary">Default Color</Typography>
                  )}
                </Box>
              }
            >
              <Box sx={{ position: 'relative' }}>
                {color.image_url ? (
                  <Card sx={{ width: 30, height: 30 }}>
                    <CardMedia
                      component="img"
                      height="30"
                      image={color.image_url}
                      alt={color.name}
                    />
                  </Card>
                ) : (
                  <Box
                    sx={{
                      width: 30,
                      height: 30,
                      bgcolor: color.color_code,
                      border: '1px solid #ccc',
                      borderRadius: '4px'
                    }}
                  />
                )}
                {color.is_default && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                      width: 8,
                      height: 8,
                      bgcolor: 'primary.main',
                      borderRadius: '50%'
                    }}
                  />
                )}
              </Box>
            </Tooltip>
          )) || 'N/A'}
        </Box>
      ),
    },
    {
      field: 'care_instructions',
      headerName: 'Care Instructions',
      flex: 1,
      renderCell: (params) => (
        <Box display="flex" gap={0.5}>
          {params.row.product_care_instructions?.length > 0 ? (
            <Tooltip title={params.row.product_care_instructions.map((ci: ProductCareInstruction) => ci.instruction).join('\n')}>
              <Chip label={`${params.row.product_care_instructions.length} instructions`} size="small" />
            </Tooltip>
          ) : (
            'N/A'
          )}
        </Box>
      ),
    },
    {
      field: 'image',
      headerName: 'Image',
      flex: 1,
      renderCell: (params) => (
        params.row.image_url ? (
          <Card sx={{ width: 60, height: 60 }}>
            <CardMedia
              component="img"
              height="60"
              image={params.row.image_url}
              alt={params.row.name}
            />
          </Card>
        ) : 'No Image'
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      renderCell: (params) => (
        <Box>
          <IconButton onClick={() => handleOpen(params.row)}>
            <EditIcon />
          </IconButton>
          <IconButton onClick={() => handleDelete(params.row.id)}>
            <DeleteIcon />
          </IconButton>
        </Box>
      ),
    },
  ];

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name')
      .order('name');

    if (error) {
      toast.error('Error fetching categories');
      return;
    }

    setCategories(data);
  };

  const fetchSubCategories = async () => {
    const { data, error } = await supabase
      .from('sub_categories')
      .select(`
        id,
        name,
        category_id,
        category:categories (
          id,
          name
        )
      `)
      .order('name');

    if (error) {
      toast.error('Error fetching subcategories');
      return;
    }

    // Convert the data to match SubCategory type
    const convertedData: SubCategory[] = data.map(item => {
      const categoryData = Array.isArray(item.category) && item.category.length > 0
        ? item.category[0]
        : (item.category || { id: '', name: '' });

      return {
        id: String(item.id || ''),
        name: item.name || '',
        category_id: String(item.category_id || ''),
        category: {
          id: String(Array.isArray(categoryData) ? categoryData[0]?.id : categoryData?.id || ''),
          name: Array.isArray(categoryData) ? categoryData[0]?.name || '' : categoryData?.name || ''
        }
      };
    });

    setSubCategories(convertedData);
  };

  const fetchRegions = async () => {
    const { data, error } = await supabase
      .from('regions')
      .select('id, name')
      .order('name');

    if (error) {
      toast.error('Error fetching regions');
      return;
    }

    setRegions(data);
  };

  const fetchProducts = async () => {
    console.log('Fetching products...');
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        subcategory:sub_categories (
          id,
          name,
          category:categories (
            id,
            name
          )
        ),
        region_product_mapping (
          region:regions (
            id,
            name
          )
        ),
        product_colors (
          id,
          name,
          color_code,
          image_url,
          is_default
        ),
        product_care_instructions (
          id,
          instruction,
          icon
        )
      `)
      .order('name');

    if (error) {
      console.error('Error fetching products:', error);
      toast.error('Error fetching products');
      return;
    }

    console.log('Products fetched:', data);
    setProducts(data);
  };

  useEffect(() => {
    fetchCategories();
    fetchSubCategories();
    fetchRegions();
    fetchProducts();
  }, []);

  useEffect(() => {
    let filtered = [...products];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query) ||
        product.reference?.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    const filteredCategories = filtered.filter(product => {
      const categoryMatch = !selectedCategory || 
        String(product.subcategory?.category?.id) === String(selectedCategory);
      const subCategoryMatch = !selectedSubCategory || 
        String(product.subcategory?.id) === String(selectedSubCategory);
      return categoryMatch && subCategoryMatch;
    });

    // Apply region filter
    if (selectedRegions.length > 0) {
      filtered = filteredCategories.filter(product => {
        const productRegionIds = product.region_product_mapping?.map(rpm => rpm.region.id) || [];
        return selectedRegions.some(region => productRegionIds.includes(Number(region.id)));
      });
    } else {
      filtered = filteredCategories;
    }

    setFilteredProducts(filtered);
  }, [products, searchQuery, selectedCategory, selectedSubCategory, selectedRegions]);

  useEffect(() => {
    if (selectedCategory) {
      const filtered = subCategories.filter(sc => sc.category_id === selectedCategory);
      setFilteredSubCategories(filtered);
    } else {
      setFilteredSubCategories(subCategories);
    }
  }, [selectedCategory, subCategories]);

  const handleOpen = (product?: Product) => {
    if (product) {
      setEditingId(product.id);
      const categoryId = product.subcategory?.category?.id.toString() || '';
      setSelectedCategory(categoryId);
      const filtered = subCategories.filter(sc => sc.category_id === categoryId);
      setFilteredSubCategories(filtered);
      
      setFormData({
        name: product.name,
        description: product.description || '',
        subcategory_id: product.subcategory_id,
        price: product.price?.toString() || '',
        is_active: product.is_active,
        reference: product.reference || '',
        composition: product.composition || '',
        technique: product.technique || '',
        width: product.width || '',
        weight: product.weight || '',
        martindale: product.martindale || '',
        repeats: product.repeats || '',
        end_use: product.end_use || '',
        image_url: product.image_url || '',
        region_ids: product.region_product_mapping?.map(rpm => rpm.region.id) || [],
        colors: product.product_colors?.map(pc => ({
          color_name: pc.name,
          color_code: pc.color_code,
          image_url: pc.image_url || '',
          is_default: pc.is_default || false
        })) || [],
        care_instructions: product.product_care_instructions?.map(ci => ci.instruction) || [],
      });
    } else {
      setEditingId(null);
      setSelectedCategory('');
      setFilteredSubCategories([]); 
      setFormData({
        name: '',
        description: '',
        subcategory_id: 0,
        price: '',
        is_active: true,
        reference: '',
        composition: '',
        technique: '',
        width: '',
        weight: '',
        martindale: '',
        repeats: '',
        end_use: '',
        image_url: '',
        region_ids: [],
        colors: [],
        care_instructions: [],
      });
    }
    setOpen(true);
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      let image_url = formData.image_url;

      if (formData.image) {
        const uploadedUrl = await uploadImage(formData.image);
        if (uploadedUrl) {
          image_url = uploadedUrl;
        }
      }

      const productData = {
        name: formData.name,
        description: formData.description,
        subcategory_id: formData.subcategory_id,
        price: formData.price ? parseFloat(formData.price) : null,
        is_active: formData.is_active,
        reference: formData.reference,
        composition: formData.composition,
        technique: formData.technique,
        width: formData.width,
        weight: formData.weight,
        martindale: formData.martindale,
        repeats: formData.repeats,
        end_use: formData.end_use,
        image_url,
      };

      let productId = editingId;

      if (editingId) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Product updated successfully');
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert([productData])
          .select();

        if (error) throw error;
        if (data) productId = data[0].id;
        toast.success('Product created successfully');
      }

      // Handle region mappings
      if (productId) {
        // Delete existing mappings
        await supabase
          .from('region_product_mapping')
          .delete()
          .eq('product_id', productId);

        // Insert new mappings
        if (formData.region_ids.length > 0) {
          const mappings = formData.region_ids.map(region_id => ({
            region_id,
            product_id: productId,
          }));

          const { error } = await supabase
            .from('region_product_mapping')
            .insert(mappings);

          if (error) throw error;
        }
      }

      // Handle colors
      if (productId) {
        // Delete existing colors
        await supabase
          .from('product_colors')
          .delete()
          .eq('product_id', productId);

        // Insert new colors
        if (formData.colors.length > 0) {
          const colors = formData.colors.map(color => ({
            product_id: productId,
            name: color.color_name,
            color_code: color.color_code,
            image_url: color.image_url,
            is_default: color.is_default,
          }));

          const { error } = await supabase
            .from('product_colors')
            .insert(colors);

          if (error) throw error;
        }
      }

      // Handle care instructions
      if (productId) {
        // Delete existing care instructions
        await supabase
          .from('product_care_instructions')
          .delete()
          .eq('product_id', productId);

        // Insert new care instructions
        if (formData.care_instructions.length > 0) {
          const careInstructions = formData.care_instructions.map(instruction => ({
            product_id: productId,
            instruction,
          }));

          const { error } = await supabase
            .from('product_care_instructions')
            .insert(careInstructions);

          if (error) throw error;
        }
      }

      setOpen(false);
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Error saving product');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) {
        toast.error('Error deleting product');
        return;
      }

      toast.success('Product deleted successfully');
      fetchProducts();
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          Products
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Add Product
        </Button>
      </Box>

      <FilterSearch
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedRegions={selectedRegions.map(r => ({ ...r, id: r.id.toString() }))}
        onRegionChange={(regions) => setSelectedRegions(regions.map(r => ({ ...r, id: Number(r.id) })))}
        selectedCategory={selectedCategory}
        onCategoryChange={(categoryId) => {
          setSelectedCategory(categoryId);
          setSelectedSubCategory('');
          setFilteredSubCategories(subCategories.filter(sc => sc.category_id === categoryId));
        }}
        selectedSubCategory={selectedSubCategory}
        onSubCategoryChange={setSelectedSubCategory}
        regions={regions.map(r => ({ ...r, id: r.id.toString() }))}
        categories={categories.map(c => ({ ...c, id: c.id.toString() }))}
        subCategories={subCategories.map(sc => ({ 
          ...sc, 
          id: sc.id.toString(),
          category_id: sc.category_id.toString()
        }))}
        showSubCategoryFilter={true}
      />

      <DataGrid
        rows={filteredProducts}
        columns={columns}
        initialState={{
          pagination: {
            paginationModel: { page: 0, pageSize: 10 },
          },
        }}
        pageSizeOptions={[10, 20, 50]}
        autoHeight
      />

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingId ? 'Edit Product' : 'Add Product'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Name"
                fullWidth
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  value={selectedCategory}
                  label="Category"
                  onChange={(e) => {
                    const categoryId = e.target.value;
                    setSelectedCategory(categoryId);
                    setFormData(prev => ({ ...prev, subcategory_id: 0 })); // Reset subcategory when category changes
                    const filtered = subCategories.filter(sc => sc.category_id === categoryId);
                    setFilteredSubCategories(filtered);
                  }}
                >
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Subcategory</InputLabel>
                <Select
                  value={formData.subcategory_id}
                  label="Subcategory"
                  onChange={(e) => setFormData(prev => ({ ...prev, subcategory_id: Number(e.target.value) }))}
                >
                  {filteredSubCategories.map((subCategory) => (
                    <MenuItem key={subCategory.id} value={subCategory.id}>
                      {subCategory.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Associated Regions</InputLabel>
                <Select
                  multiple
                  value={formData.region_ids}
                  label="Associated Regions"
                  onChange={(e) => {
                    const value = e.target.value as number[];
                    setFormData(prev => ({ ...prev, region_ids: value }));
                  }}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => {
                        const region = regions.find(r => r.id === value);
                        return region ? (
                          <Chip key={value} label={region.name} size="small" />
                        ) : null;
                      })}
                    </Box>
                  )}
                >
                  {regions.map((region) => (
                    <MenuItem key={region.id} value={region.id}>
                      {region.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Product Image
              </Typography>
              <Tabs value={imageTab} onChange={(_, v) => setImageTab(v)}>
                <Tab label="Upload" />
                <Tab label="URL" />
              </Tabs>
              <Box sx={{ mt: 2 }}>
                {imageTab === 0 ? (
                  <Box>
                   {/*} <input
                      accept="image/*"
                      style={{ display: 'none' }}
                      id="product-image"
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setFormData(prev => ({ ...prev, image: file }));
                        }
                      }}
                    />
                    <label htmlFor="product-image">
                      <Button
                        variant="outlined"
                        component="span"
                        startIcon={<ImageIcon />}
                      >
                        Choose Image
                      </Button>
                    </label>
                    */}
                    {(formData.image_url || formData.image) && (
                      <Card sx={{ mt: 2, maxWidth: 200 }}>
                        <CardMedia
                          component="img"
                          height="140"
                          image={formData.image ? URL.createObjectURL(formData.image) : formData.image_url}
                          alt="Product image preview"
                        />
                      </Card>
                    )}
                  </Box>
                ) : (
                  <TextField
                    fullWidth
                    label="Image URL"
                    value={formData.image_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                    InputProps={{
                      endAdornment: formData.image_url && (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => window.open(formData.image_url, '_blank')}>
                            <ImageIcon />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              </Box>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  />
                }
                label="Active"
              />
            </Grid>

            {/* Colors Section */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Colors</Typography>
              {formData.colors.map((color, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                  <TextField
                    label="Color Name"
                    value={color.color_name}
                    onChange={(e) => {
                      const newColors = [...formData.colors];
                      newColors[index].color_name = e.target.value;
                      setFormData({ ...formData, colors: newColors });
                    }}
                    size="small"
                  />
                  <TextField
                    label="Color Code"
                    value={color.color_code}
                    onChange={(e) => {
                      const newColors = [...formData.colors];
                      newColors[index].color_code = e.target.value;
                      setFormData({ ...formData, colors: newColors });
                    }}
                    size="small"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <Box
                            sx={{
                              width: 20,
                              height: 20,
                              bgcolor: color.color_code,
                              border: '1px solid #ccc',
                              borderRadius: '4px'
                            }}
                          />
                        </InputAdornment>
                      )
                    }}
                  />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <TextField
                      label="Color Image URL"
                      value={color.image_url}
                      onChange={(e) => {
                        const newColors = [...formData.colors];
                        newColors[index].image_url = e.target.value;
                        setFormData({ ...formData, colors: newColors });
                      }}
                      size="small"
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <input
                        accept="image/*"
                        type="file"
                        id={`color-image-${index}`}
                        style={{ display: 'none' }}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const newColors = [...formData.colors];
                            newColors[index].image = file;
                            
                            try {
                              const uploadedUrl = await uploadImage(file);
                              if (uploadedUrl) {
                                newColors[index].image_url = uploadedUrl;
                              }
                            } catch (error) {
                              console.error('Error uploading image:', error);
                              toast.error('Error uploading image');
                            }
                            
                            setFormData({ ...formData, colors: newColors });
                          }
                        }}
                      />
                      <label htmlFor={`color-image-${index}`}>
                        <Button
                          component="span"
                          size="small"
                          startIcon={<ImageIcon />}
                        >
                          Upload Image
                        </Button>
                      </label>
                    </Box>
                  </Box>
                  {color.image_url && (
                    <Card sx={{ width: 60, height: 60 }}>
                      <CardMedia
                        component="img"
                        height="60"
                        image={color.image_url}
                        alt={color.color_name}
                      />
                    </Card>
                  )}
                  <FormControlLabel
                    control={
                      <Switch
                        checked={color.is_default}
                        onChange={(e) => {
                          const newColors = [...formData.colors];
                          // Unset other default colors if this one is being set as default
                          if (e.target.checked) {
                            newColors.forEach(c => c.is_default = false);
                          }
                          newColors[index].is_default = e.target.checked;
                          setFormData({ ...formData, colors: newColors });
                        }}
                      />
                    }
                    label="Default"
                  />
                  <IconButton
                    onClick={() => {
                      const newColors = formData.colors.filter((_, i) => i !== index);
                      setFormData({ ...formData, colors: newColors });
                    }}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
              <Button
                startIcon={<AddIcon />}
                onClick={() => {
                  setFormData({
                    ...formData,
                    colors: [...formData.colors, { color_name: '', color_code: '', image_url: '', is_default: false }]
                  });
                }}
                size="small"
              >
                Add Color
              </Button>
            </Grid>

            {/* Care Instructions Section */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Care Instructions</Typography>
              {formData.care_instructions.map((instruction, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    fullWidth
                    label="Instruction"
                    value={instruction}
                    onChange={(e) => {
                      const newInstructions = [...formData.care_instructions];
                      newInstructions[index] = e.target.value;
                      setFormData({ ...formData, care_instructions: newInstructions });
                    }}
                    size="small"
                  />
                  <IconButton
                    onClick={() => {
                      const newInstructions = formData.care_instructions.filter((_, i) => i !== index);
                      setFormData({ ...formData, care_instructions: newInstructions });
                    }}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
              <Button
                startIcon={<AddIcon />}
                onClick={() => {
                  setFormData({
                    ...formData,
                    care_instructions: [...formData.care_instructions, '']
                  });
                }}
                size="small"
              >
                Add Care Instruction
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
          <Button 
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : undefined}
          >
            {loading ? 'Saving...' : editingId ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}